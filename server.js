import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

app.use(cors())
app.use(express.json())

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

const ensureApiKey = (res) => {
  if (!OPENAI_API_KEY) {
    res.status(500).json({ error: 'OpenAI API key non configurata' })
    return false
  }
  return true
}

const callOpenAI = async (messages, options = {}) => {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 900
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || 'Errore OpenAI')
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

const parseJsonFromText = (text, fallback = {}) => {
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1))
      } catch {
        return fallback
      }
    }
    return fallback
  }
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body

    if (!ensureApiKey(res)) return

    const messages = [
      {
        role: 'system',
        content: 'Sei Amico, un assistente educativo 2D dal cuore gentile. Rispondi in modo breve, amichevole e educativo. Incoraggia la curiosità dell\'utente. Mantieni un tono positivo e entusiasta. Rispondi sempre in italiano.'
      },
      ...(conversationHistory || []).map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ]

    messages.push({ role: 'user', content: message })
    const reply = await callOpenAI(messages, { temperature: 0.7, maxTokens: 350 })

    res.json({ reply })
  } catch (error) {
    console.error('Errore server:', error)
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

app.post('/api/extract', async (req, res) => {
  try {
    if (!ensureApiKey(res)) return

    const { type, text } = req.body
    const targetMap = {
      class: 'classe scolastica (es. 3 media, 5 elementare, 2 superiore)',
      subject: 'materia scolastica (es. scienze, matematica, italiano)',
      topic: 'argomento specifico della materia (es. ciclo dell\'acqua, frazioni, verbi)'
    }

    const target = targetMap[type] || 'informazione richiesta'
    const prompt = `Testo utente: "${text}".\nEstrai solo ${target}.\nRispondi ESCLUSIVAMENTE in JSON valido con questo formato: {"value":"..."}.\nSe non trovi nulla metti value con stringa vuota.`

    const output = await callOpenAI([
      {
        role: 'system',
        content: 'Sei un estrattore di entita. Rispondi solo con JSON valido, senza testo extra.'
      },
      { role: 'user', content: prompt }
    ], { temperature: 0, maxTokens: 120 })

    const parsed = parseJsonFromText(output, { value: '' })
    res.json({ value: (parsed.value || '').trim() })
  } catch (error) {
    console.error('Errore extract:', error)
    res.status(500).json({ error: 'Errore durante l\'estrazione del testo' })
  }
})

app.post('/api/generate-quiz', async (req, res) => {
  try {
    if (!ensureApiKey(res)) return

    const { classLevel, subject, topic } = req.body
    const prompt = `Genera 5 domande brevi e progressive per uno studente di ${classLevel}, materia ${subject}, argomento ${topic}.\nLe domande devono essere adatte all\'eta e in italiano.\nRispondi SOLO in JSON valido: {"questions":["...","...","...","...","..."]}`

    const output = await callOpenAI([
      {
        role: 'system',
        content: 'Sei un insegnante esperto. Rispondi sempre e solo in JSON valido, senza testo extra.'
      },
      { role: 'user', content: prompt }
    ], { temperature: 0.5, maxTokens: 700 })

    const parsed = parseJsonFromText(output, { questions: [] })
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.filter(Boolean).slice(0, 5)
      : []

    if (questions.length < 5) {
      return res.status(500).json({ error: 'Non sono riuscito a generare 5 domande valide' })
    }

    res.json({ questions })
  } catch (error) {
    console.error('Errore generate-quiz:', error)
    res.status(500).json({ error: 'Errore durante la generazione del quiz' })
  }
})

app.post('/api/evaluate-quiz', async (req, res) => {
  try {
    if (!ensureApiKey(res)) return

    const { classLevel, subject, topic, qa } = req.body
    const prompt = `Valuta le risposte di uno studente di ${classLevel} su ${subject}, argomento ${topic}.\n\nDomande e risposte:\n${JSON.stringify(qa, null, 2)}\n\nRestituisci SOLO JSON valido con formato:\n{\n  "score": numero intero da 1 a 10,\n  "results": [\n    {"question":"...","answer":"...","isCorrect":true/false,"feedback":"Spiega in modo semplice l'errore o conferma cosa e corretto"}\n  ],\n  "summary":"breve sintesi motivante per il bambino"\n}`

    const output = await callOpenAI([
      {
        role: 'system',
        content: 'Sei un insegnante paziente e accurato. Rispondi esclusivamente in JSON valido, senza testo extra.'
      },
      { role: 'user', content: prompt }
    ], { temperature: 0.2, maxTokens: 1400 })

    const parsed = parseJsonFromText(output, { score: 6, results: [], summary: '' })

    const results = Array.isArray(parsed.results)
      ? parsed.results.slice(0, 5).map((item, idx) => ({
          question: item.question || qa?.[idx]?.question || `Domanda ${idx + 1}`,
          answer: item.answer || qa?.[idx]?.answer || '',
          isCorrect: Boolean(item.isCorrect),
          feedback: item.feedback || 'Risposta valutata.'
        }))
      : []

    const safeScore = Number.isFinite(Number(parsed.score))
      ? Math.min(10, Math.max(1, Math.round(Number(parsed.score))))
      : 6

    res.json({
      score: safeScore,
      results,
      summary: parsed.summary || ''
    })
  } catch (error) {
    console.error('Errore evaluate-quiz:', error)
    res.status(500).json({ error: 'Errore durante la valutazione del quiz' })
  }
})

app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`)
  if (!OPENAI_API_KEY) {
    console.warn('⚠️  Attenzione: OPENAI_API_KEY non è configurata!')
  }
})
