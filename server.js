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
const OPENAI_IMAGE_URL = 'https://api.openai.com/v1/images/generations'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'
const POLLINATIONS_IMAGE_URL = 'https://image.pollinations.ai/prompt/'
const GRADE_LABELS = ['Insufficiente', 'Sufficiente', 'Discreto', 'Buono', 'Distinto', 'Ottimo']
const IMAGE_STYLE_GUIDE = 'Stile visivo: fotografia educativa realistica, aspetto naturale, luce morbida, dettagli credibili, materiali e ambienti verosimili, composizione fotografica pulita, resa ad alta definizione, niente effetto cartoon o illustrazione.'
const INFOGRAPHIC_STYLE_GUIDE = 'Stile visivo: infografica didattica moderna e realistica, pulita e professionale, layout chiaro, alta leggibilita, palette equilibrata, aspetto vicino a materiale scolastico premium.'

const NON_EVALUABLE_PATTERNS = [
  /non\s+lo\s+so/i,
  /non\s+so/i,
  /non\s+l['’]?abbiamo\s+(ancora\s+)?fatto/i,
  /non\s+l['’]?ho\s+(ancora\s+)?fatto/i,
  /non\s+affrontat[oa]/i,
  /non\s+studiat[oa]/i,
  /non\s+fatto\s+a\s+scuola/i,
  /non\s+visto\s+a\s+scuola/i,
  /non\s+ricordo/i
]

const URL_REGEX = /https?:\/\/[^\s)\]}>,]+/gi
const IMAGE_EXT_REGEX = /\.(png|jpg|jpeg|gif|webp|svg|bmp|avif)(?:\?.*)?$/i

const compactWords = (value = '') => String(value || '')
  .replace(/[^\w\sàèéìòù]/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const buildGeneratedImageFallback = ({ prompt = '', seed = 1 }) => {
  const safePrompt = compactWords(prompt) || 'illustrazione didattica scolastica'
  const encodedPrompt = encodeURIComponent(safePrompt)
  const safeSeed = Number.isFinite(Number(seed)) ? Number(seed) : 1
  return `${POLLINATIONS_IMAGE_URL}${encodedPrompt}?width=1024&height=1024&seed=${safeSeed}&model=flux&nologo=true`
}

const fetchImageAsDataUrl = async (url = '') => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Immagine fallback non disponibile: ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || 'image/png'
  const buffer = Buffer.from(await response.arrayBuffer())
  return `data:${contentType};base64,${buffer.toString('base64')}`
}

const shouldSuggestReviewSchema = (text = '') => {
  const normalized = compactWords(text).toLowerCase()
  return /(cronologia|epoca|secolo|storia|timeline|linea del tempo|fasi|passaggi|ciclo|processo|grafico|trend|andamento|dati|percentuale)/i.test(normalized)
}

const buildSchemaHint = ({ schemaType = 'timeline', title = '', points = [] }) => {
  const safePoints = Array.isArray(points)
    ? points.filter(Boolean).map((item) => compactWords(item)).slice(0, 6)
    : []

  const basePoints = safePoints.length ? safePoints : ['Fase iniziale', 'Fase centrale', 'Fase finale']
  const safeTitle = compactWords(title) || 'Schema di ripasso'
  const typeLabel = schemaType === 'bar' ? 'grafico a barre' : 'linea del tempo'

  return {
    typeLabel,
    safeTitle,
    basePoints
  }
}

const normalizeVisualType = (value = '') => {
  const normalized = compactWords(value).toLowerCase()
  const visualTypes = ['illustration', 'chart', 'map', 'table', 'schema', 'timeline', 'diagram']
  return visualTypes.includes(normalized) ? normalized : 'illustration'
}

const mapScoreToGrade = (score) => {
  if (!Number.isFinite(Number(score))) return 'Sufficiente'
  const safeScore = Math.min(10, Math.max(1, Math.round(Number(score))))
  if (safeScore <= 4) return 'Insufficiente'
  if (safeScore <= 6) return 'Sufficiente'
  if (safeScore === 7) return 'Discreto'
  if (safeScore === 8) return 'Buono'
  if (safeScore === 9) return 'Distinto'
  return 'Ottimo'
}

const isNonEvaluableAnswer = (answer = '') => {
  const normalized = String(answer || '').toLowerCase().trim()
  if (!normalized) return false
  return NON_EVALUABLE_PATTERNS.some((pattern) => pattern.test(normalized))
}

const computeGradeFromResults = (results = []) => {
  const evaluated = results.filter((item) => !item.isSkipped)
  if (!evaluated.length) return 'Sufficiente'

  const correct = evaluated.filter((item) => item.isCorrect).length
  const score = (correct / evaluated.length) * 10
  return mapScoreToGrade(score)
}

const extractUrls = (text = '') => {
  const matches = String(text || '').match(URL_REGEX) || []
  return [...new Set(matches)]
}

const isImageUrl = (url = '') => IMAGE_EXT_REGEX.test(String(url || '').trim())

const stripUrlsFromText = (text = '') => {
  return String(text || '')
    .replace(URL_REGEX, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim()
}

const summarizeLinksInItalian = async ({ links = [], classLevel = '', subject = '', topic = '' }) => {
  if (!links.length) return ''

  const prompt = `Genera un breve riassunto didattico in italiano, adatto a uno studente di ${classLevel}, su ${subject} (${topic}), basandoti sui seguenti link suggeriti:\n${links.join('\n')}\n\nVincoli:\n- 3-5 frasi semplici e chiare.\n- Tono incoraggiante per bambino/ragazzo.\n- NON inserire URL o riferimenti ai link nel testo finale.\n- Restituisci SOLO JSON valido: {"summary":"..."}`

  const output = await callOpenAI([
    {
      role: 'system',
      content: 'Sei un tutor didattico in italiano. Rispondi solo in JSON valido, senza testo extra.'
    },
    { role: 'user', content: prompt }
  ], { temperature: 0.3, maxTokens: 280 })

  const parsed = parseJsonFromText(output, { summary: '' })
  return stripUrlsFromText(parsed.summary || '')
}

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

const callOpenAIImage = async (prompt, options = {}) => {
  const response = await fetch(OPENAI_IMAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: options.size || '1024x1024',
      quality: options.quality || 'medium',
      response_format: 'b64_json'
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || 'Errore generazione immagine')
  }

  const data = await response.json()
  const b64 = data?.data?.[0]?.b64_json
  if (!b64) {
    throw new Error('Risposta immagini senza b64_json')
  }

  return `data:image/png;base64,${b64}`
}

const generateEducationalImage = async ({
  area = 'study',
  classLevel = '',
  subject = '',
  visualQuery = '',
  reply = '',
  imagePrompt = '',
  visualType = 'illustration'
}) => {
  const safeArea = area === 'review' ? 'ripasso' : 'studio guidato'
  const safeVisualType = normalizeVisualType(visualType)
  const visualTypePromptMap = {
    illustration: 'Crea una immagine fotografica didattica realistica e molto chiara.',
    chart: 'Crea un grafico didattico moderno e leggibile, con impostazione pulita e professionale.',
    map: 'Crea una cartina o mappa didattica realistica, ordinata e facile da leggere.',
    table: 'Crea una tabella visiva didattica elegante, ordinata e molto leggibile.',
    schema: 'Crea uno schema didattico moderno, organizzato e facile da studiare.',
    timeline: 'Crea una linea del tempo didattica moderna, ordinata e visivamente chiara.',
    diagram: 'Crea un diagramma didattico moderno, ben strutturato e molto leggibile.'
  }

  const styleGuide = safeVisualType === 'illustration'
    ? IMAGE_STYLE_GUIDE
    : INFOGRAPHIC_STYLE_GUIDE

  const prompt = [
    visualTypePromptMap[safeVisualType],
    styleGuide,
    `Contesto: ${safeArea}.`,
    `Classe: ${classLevel || 'scuola secondaria'}.`,
    `Materia: ${subject || 'materie scolastiche'}.`,
    `Tema: ${visualQuery || 'concetto scolastico principale'}.`,
    `Contenuto della spiegazione da rappresentare: ${stripUrlsFromText(reply || '') || 'spiegazione didattica pertinente'}.`,
    `Prompt visuale preparato da OpenAI: ${imagePrompt || visualQuery || 'immagine didattica coerente con il testo'}.`,
    safeVisualType === 'illustration'
      ? 'Niente testo nell\'immagine, niente watermark, aspetto fotografico realistico, luce naturale, proporzioni credibili, anatomia umana corretta (volti completi, occhi interi, arti proporzionati), niente stile cartoon o pittorico.'
      : 'Se utile inserisci solo etichette brevi e leggibili in italiano, niente watermark, layout pulito, forte coerenza con il testo spiegato, niente elementi decorativi inutili.'
  ].join(' ')

  try {
    return await callOpenAIImage(prompt, { size: '1024x1024', quality: 'high' })
  } catch (error) {
    const fallbackUrl = buildGeneratedImageFallback({
      prompt: `${subject} ${imagePrompt || visualQuery || reply} ${safeVisualType} didattico`,
      seed: Date.now() % 100000
    })

    try {
      return await fetchImageAsDataUrl(fallbackUrl)
    } catch (fallbackError) {
      console.error('Errore fallback immagine didattica:', error, fallbackError)
      return fallbackUrl
    }
  }
}

const generateSchemaImage = async ({ schemaType = 'timeline', title = '', points = [], classLevel = '', subject = '' }) => {
  const schema = buildSchemaHint({ schemaType, title, points })
  const prompt = [
    `Crea un ${schema.typeLabel} didattico pulito e leggibile per studenti.`,
    INFOGRAPHIC_STYLE_GUIDE,
    `Titolo: ${schema.safeTitle}.`,
    `Materia: ${subject || 'materia scolastica'}.`,
    `Classe: ${classLevel || 'scuola secondaria'}.`,
    `Elementi da includere: ${schema.basePoints.join(', ')}.`,
    'Design infografico semplice, sfondo chiaro, etichette brevi in italiano, senza personaggi cartoon, forte equilibrio tra chiarezza e bellezza visiva.'
  ].join(' ')

  try {
    return await callOpenAIImage(prompt, { size: '1024x1024', quality: 'high' })
  } catch (error) {
    const fallbackUrl = buildGeneratedImageFallback({
      prompt: `${schema.typeLabel} ${schema.safeTitle} ${schema.basePoints.join(' ')} infografica scolastica`,
      seed: Date.now() % 100000
    })

    try {
      return await fetchImageAsDataUrl(fallbackUrl)
    } catch (fallbackError) {
      console.error('Errore fallback schema immagine:', error, fallbackError)
      return fallbackUrl
    }
  }
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
    const { message, conversationHistory, area = 'study', classLevel = '', subject = '', studentName = '' } = req.body

    if (!ensureApiKey(res)) return

    const safeArea = ['study', 'review', 'quiz'].includes(area) ? area : 'study'
    const areaPromptMap = {
      study: 'Modalita STUDIAMO INSIEME: spiega in modo chiaro e guidato.',
      review: 'Modalita RIPASSO: sintetizza, evidenzia parole chiave e struttura la spiegazione in punti.',
      quiz: 'Modalita QUIZ: incoraggia e guida senza svelare subito la soluzione completa.'
    }

    const messages = [
      {
        role: 'system',
        content: 'Sei Amico, un assistente educativo 2D dal cuore gentile. Rispondi in modo breve, amichevole e educativo. Incoraggia la curiosita dell\'utente. Mantieni un tono positivo e rispondi sempre in italiano.'
      },
      {
        role: 'system',
        content: `${areaPromptMap[safeArea]} Restituisci SOLO JSON valido nel formato: {"reply":"...","visualQuery":"...","visualType":"illustration|chart|map|table|schema|timeline|diagram","imagePrompt":"...","needsSchema":true/false,"schemaType":"timeline|bar","schemaTitle":"...","schemaPoints":["..."]}. Regole: reply massimo 7 frasi. visualQuery breve (3-7 parole). imagePrompt deve essere un prompt visivo dettagliato e coerente con il testo scritto. Se l'utente chiede esplicitamente un grafico, una cartina, una tabella, uno schema, una timeline o un diagramma, visualType deve rispettare esattamente quella richiesta. Se area e review e il contenuto e sequenziale o basato su dati, needsSchema=true con schemaType timeline o bar e 3-6 schemaPoints sintetici.`
      },
      {
        role: 'system',
        content: `Contesto studente: nome=${studentName || 'studente'}, classe=${classLevel || 'non specificata'}, materia=${subject || 'non specificata'}.`
      },
      ...(conversationHistory || []).map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ]

    messages.push({ role: 'user', content: message })
    const output = await callOpenAI(messages, { temperature: 0.5, maxTokens: 500 })
    const parsed = parseJsonFromText(output, {
      reply: '',
      visualQuery: '',
      visualType: 'illustration',
      imagePrompt: '',
      needsSchema: false,
      schemaType: 'timeline',
      schemaTitle: '',
      schemaPoints: []
    })

    const reply = stripUrlsFromText(parsed.reply || output || '').trim() || 'Proviamo insieme con un altro esempio.'
    const visualQuery = compactWords(parsed.visualQuery || `${subject} ${message}`)
    const forceSchema = safeArea === 'review' && shouldSuggestReviewSchema(`${message} ${reply}`)
    const needsSchema = safeArea === 'review' && (Boolean(parsed.needsSchema) || forceSchema)

    res.json({
      reply,
      visualQuery,
      visualType: normalizeVisualType(parsed.visualType || 'illustration'),
      imagePrompt: stripUrlsFromText(parsed.imagePrompt || '').trim(),
      needsSchema,
      schemaType: parsed.schemaType || 'timeline',
      schemaTitle: parsed.schemaTitle || '',
      schemaPoints: Array.isArray(parsed.schemaPoints) ? parsed.schemaPoints.slice(0, 6) : []
    })
  } catch (error) {
    console.error('Errore server:', error)
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

app.post('/api/generate-visuals', async (req, res) => {
  try {
    if (!ensureApiKey(res)) return

    const {
      area = 'study',
      classLevel = '',
      subject = '',
      message = '',
      reply = '',
      imagePrompt = '',
      visualType = 'illustration',
      visualQuery = '',
      needsSchema = false,
      schemaType = 'timeline',
      schemaTitle = '',
      schemaPoints = []
    } = req.body

    const safeArea = ['study', 'review', 'quiz'].includes(area) ? area : 'study'
    if (!(safeArea === 'study' || safeArea === 'review')) {
      return res.json({ imagePreviews: [] })
    }

    const imagesToGenerate = [
      generateEducationalImage({
        area: safeArea,
        classLevel,
        subject,
        visualQuery: compactWords(visualQuery || `${subject} ${message}`),
        reply,
        imagePrompt,
        visualType
      })
    ]

    const forceSchema = safeArea === 'review' && shouldSuggestReviewSchema(`${message} ${reply}`)
    const shouldGenerateSchema = safeArea === 'review' && (Boolean(needsSchema) || forceSchema)
    const primaryVisualType = normalizeVisualType(visualType)

    if (shouldGenerateSchema && !['chart', 'table', 'schema', 'timeline', 'diagram'].includes(primaryVisualType)) {
      imagesToGenerate.push(
        generateSchemaImage({
          schemaType,
          title: schemaTitle || subject || 'Schema di ripasso',
          points: Array.isArray(schemaPoints) ? schemaPoints.slice(0, 6) : [],
          classLevel,
          subject
        })
      )
    }

    const generated = await Promise.all(imagesToGenerate)
    const imagePreviews = [...new Set(generated.filter(Boolean))].slice(0, 4)

    res.json({ imagePreviews })
  } catch (error) {
    console.error('Errore generate-visuals:', error)
    res.status(500).json({ error: 'Errore durante la generazione visuale' })
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
    const prompt = `Valuta le risposte di uno studente di ${classLevel} su ${subject}, argomento ${topic}.\n\nDomande e risposte:\n${JSON.stringify(qa, null, 2)}\n\nRegole importanti:\n1) Se la risposta contiene frasi come "non lo so", "non l'abbiamo fatto a scuola", "non affrontato", "non studiato", NON e una risposta sbagliata: va marcata come non valutabile.\n2) Le risposte non valutabili NON devono abbassare il voto e NON devono essere conteggiate tra le domande valutate.\n3) Valuta solo le risposte effettivamente valutabili.\n\nAssegna un voto qualitativo usando SOLO una di queste etichette: Insufficiente, Sufficiente, Discreto, Buono, Distinto, Ottimo.\n\nRestituisci SOLO JSON valido con formato:\n{\n  "grade": "Insufficiente|Sufficiente|Discreto|Buono|Distinto|Ottimo",\n  "results": [\n    {"question":"...","answer":"...","isCorrect":true/false,"isSkipped":true/false,"feedback":"Spiegazione semplice. Se isSkipped=true, spiega che la domanda non e stata conteggiata"}\n  ],\n  "summary":"spiegazione finale corposa (4-7 frasi), motivante e concreta, SENZA URL nel testo",\n  "resources": [\n    {"url":"https://...","kind":"image|article","title":"titolo breve"}\n  ]\n}`

    const output = await callOpenAI([
      {
        role: 'system',
        content: 'Sei un insegnante paziente e accurato. Rispondi esclusivamente in JSON valido, senza testo extra.'
      },
      { role: 'user', content: prompt }
    ], { temperature: 0.2, maxTokens: 1400 })

    const parsed = parseJsonFromText(output, { grade: 'Sufficiente', results: [], summary: '' })

    const sourceResults = Array.isArray(parsed.results) ? parsed.results : []
    const qaList = Array.isArray(qa) ? qa.slice(0, 5) : []

    const results = qaList.map((entry, idx) => {
      const item = sourceResults[idx] || {}
      const answer = item.answer || entry?.answer || ''
      const skippedByText = isNonEvaluableAnswer(answer)
      const isSkipped = Boolean(item.isSkipped) || skippedByText

      return {
        question: item.question || entry?.question || `Domanda ${idx + 1}`,
        answer,
        isCorrect: isSkipped ? false : Boolean(item.isCorrect),
        isSkipped,
        feedback: item.feedback || (isSkipped
          ? 'Questa risposta non e stata conteggiata nel voto perche non era stata ancora affrontata.'
          : 'Risposta valutata.')
      }
    })

    const safeGrade = computeGradeFromResults(results)
    const skippedCount = results.filter((item) => item.isSkipped).length
    const evaluatedCount = results.length - skippedCount

    const resourceList = Array.isArray(parsed.resources) ? parsed.resources : []
    const resourceUrls = [
      ...resourceList.map((item) => item?.url).filter(Boolean),
      ...extractUrls(parsed.summary || '')
    ]

    const uniqueUrls = [...new Set(resourceUrls)]
    const imagePreviews = uniqueUrls.filter((url) => isImageUrl(url)).slice(0, 4)
    const nonImageLinks = uniqueUrls.filter((url) => !isImageUrl(url)).slice(0, 4)
    const cleanSummary = stripUrlsFromText(parsed.summary || '')
    const resourceSummary = await summarizeLinksInItalian({
      links: nonImageLinks,
      classLevel,
      subject,
      topic
    })

    res.json({
      grade: safeGrade,
      results,
      summary: cleanSummary,
      resourceSummary,
      imagePreviews,
      skippedCount,
      evaluatedCount
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
