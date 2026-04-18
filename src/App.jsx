import React, { useEffect, useRef, useState } from 'react'
import Bot from './components/Bot'
import Whiteboard from './components/Whiteboard'
import InputArea from './components/InputArea'
import './App.css'

const CLASS_OPTIONS = [
  '1° Elementare',
  '2° Elementare',
  '3° Elementare',
  '4° Elementare',
  '5° Elementare',
  '1° Media',
  '2° Media',
  '3° Media',
  '1° Superiore',
  '2° Superiore',
  '3° Superiore',
  '4° Superiore',
  '5° Superiore'
]

const LEARNING_AREAS = [
  {
    id: 'study',
    label: 'Studiamo insieme',
    icon: '📚',
    description: 'Spiego e rispondo alle domande passo dopo passo.'
  },
  {
    id: 'review',
    label: 'Ripasso',
    icon: '🧠',
    description: 'Rivediamo i concetti principali in modo semplice.'
  },
  {
    id: 'quiz',
    label: 'Quiz interattivo',
    icon: '🧪',
    description: 'Ti faccio domande progressive e poi ti valuto.'
  }
]

function App() {
  const [onboardingStep, setOnboardingStep] = useState('name') // name | class | area | subject
  const [isStudioReady, setIsStudioReady] = useState(false)
  const [interactionPhase, setInteractionPhase] = useState('chat') // chat | askTopic | quiz | finished
  const [selectedArea, setSelectedArea] = useState('study')

  const [nameInput, setNameInput] = useState('')
  const [subjectInput, setSubjectInput] = useState('')

  const [botMessage, setBotMessage] = useState('Ciao! Come ti chiami?')
  const [isThinking, setIsThinking] = useState(false)
  const [botAction, setBotAction] = useState('idle') // idle, thinking, speaking, happy, confused
  const [profile, setProfile] = useState({
    studentName: '',
    classLevel: '',
    subject: '',
    topic: ''
  })
  const [conversationHistory, setConversationHistory] = useState([])
  const [quizQuestions, setQuizQuestions] = useState([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [boardImages, setBoardImages] = useState([])
  const [isVisualLoading, setIsVisualLoading] = useState(false)
  const [lessonEntries, setLessonEntries] = useState([])
  const [lessonImages, setLessonImages] = useState([])
  const [isPrinting, setIsPrinting] = useState(false)
  const timeoutRef = useRef(null)
  const latestVisualRequestRef = useRef(0)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const getAreaLabel = (areaId = selectedArea) => {
    const area = LEARNING_AREAS.find((item) => item.id === areaId)
    return area ? area.label : 'Percorso'
  }

  const getBadgeLabel = () => {
    if (interactionPhase === 'askTopic') return 'Pronti al quiz · Scegli argomento'
    if (interactionPhase === 'quiz') return `Quiz in corso · Domanda ${questionIndex + 1} di 5`
    if (interactionPhase === 'finished') return 'Quiz completato'
    return `${getAreaLabel()} · ${profile.subject || 'Materia in corso'}`
  }

  const isBadgeActive = interactionPhase === 'quiz'

  const normalizeImageUrls = (images) => {
    if (!Array.isArray(images)) return []

    return images
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
  }

  const addLessonEntry = (speaker, message) => {
    const text = String(message || '').trim()
    if (!text) return

    setLessonEntries((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        speaker,
        text,
        createdAt: new Date().toISOString()
      }
    ])
  }

  const addLessonImages = (images, source = '') => {
    const cleanImages = normalizeImageUrls(images)
    if (!cleanImages.length) return

    setLessonImages((prev) => {
      const known = new Set(prev.map((item) => item.url))
      const additions = []

      cleanImages.forEach((url) => {
        if (!known.has(url)) {
          known.add(url)
          additions.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            url,
            source,
            createdAt: new Date().toISOString()
          })
        }
      })

      return additions.length ? [...prev, ...additions] : prev
    })
  }

  const escapeHtml = (value) => {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  const formatPrintDate = (isoString) => {
    const date = new Date(isoString)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const buildAndPrintPdf = (summaryText, nowLabel) => {
    const summaryHtml = summaryText
      ? `<section class="summary-section">
          <h2>Riassunto della lezione</h2>
          <div class="summary-box">${escapeHtml(summaryText).replace(/\n/g, '<br />')}</div>
        </section>`
      : ''

    const imagesHtml = lessonImages.length
      ? `<section>
          <h2>Immagini generate</h2>
          <div class="images">${lessonImages.map((image, idx) => `
            <figure class="image-item">
              <img src="${escapeHtml(image.url)}" alt="Immagine didattica ${idx + 1}" />
              <figcaption>Immagine ${idx + 1}${image.source ? ` · ${escapeHtml(image.source)}` : ''}</figcaption>
            </figure>`).join('')}
          </div>
        </section>`
      : ''

    const entriesHtml = lessonEntries.length
      ? `<section>
          <h2>Trascrizione lezione</h2>
          <div class="entries">${lessonEntries.map((entry) => {
            const speakerClass = entry.speaker === 'Amico' ? 'entry entry-bot' : 'entry entry-user'
            return `<article class="${speakerClass}">
              <header><strong>${escapeHtml(entry.speaker)}</strong><span>${escapeHtml(formatPrintDate(entry.createdAt))}</span></header>
              <p>${escapeHtml(entry.text).replace(/\n/g, '<br />')}</p>
            </article>`
          }).join('')}</div>
        </section>`
      : ''

    const title = `Lezione - ${profile.subject || 'Materia'} - ${profile.studentName || 'Studente'}`
    const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { --ink:#1e1e1e; --muted:#6f6f6f; --line:#d8d8d8; --bot:#eef6ff; --user:#f7f7f7; }
    * { box-sizing:border-box; }
    body { margin:0; color:var(--ink); font-family:"Segoe UI",Arial,sans-serif; background:#f5f5f5; }
    .page { max-width:980px; margin:0 auto; padding:24px; background:#fff; }
    h1 { margin:0 0 6px; font-size:28px; }
    .meta { color:var(--muted); margin-bottom:18px; font-size:13px; line-height:1.6; }
    h2 { margin:22px 0 8px; font-size:19px; border-bottom:2px solid var(--line); padding-bottom:5px; }
    .summary-section { margin-bottom:4px; }
    .summary-box { background:#f0f7ff; border:1px solid #b3d4f5; border-radius:10px; padding:14px 16px; font-size:15px; line-height:1.65; }
    .entries { display:grid; gap:8px; }
    .entry { border:1px solid var(--line); border-radius:9px; padding:9px 12px; }
    .entry-bot { background:var(--bot); } .entry-user { background:var(--user); }
    .entry header { display:flex; justify-content:space-between; font-size:12px; color:var(--muted); margin-bottom:5px; }
    .entry p { margin:0; line-height:1.5; }
    .images { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px; }
    .image-item { margin:0; border:1px solid var(--line); border-radius:10px; padding:8px; break-inside:avoid; }
    .image-item img { width:100%; height:auto; border-radius:6px; display:block; object-fit:contain; max-height:480px; }
    .image-item figcaption { margin-top:6px; color:var(--muted); font-size:12px; }
    @media print { body { background:#fff; } .page { max-width:none; padding:10mm; } }
  </style>
</head>
<body>
  <main class="page">
    <h1>Report lezione</h1>
    <div class="meta">
      <div><strong>Studente:</strong> ${escapeHtml(profile.studentName || '---')}</div>
      <div><strong>Classe:</strong> ${escapeHtml(profile.classLevel || '---')}</div>
      <div><strong>Materia:</strong> ${escapeHtml(profile.subject || '---')}</div>
      <div><strong>Area:</strong> ${escapeHtml(getAreaLabel())}</div>
      <div><strong>Data stampa:</strong> ${escapeHtml(nowLabel)}</div>
    </div>
    ${summaryHtml}
    ${imagesHtml}
    ${entriesHtml}
  </main>
</body>
</html>`

    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'

    const cleanup = () => { if (frame.parentNode) frame.parentNode.removeChild(frame) }

    frame.onload = () => {
      const fw = frame.contentWindow
      if (!fw) { cleanup(); window.alert('Impossibile avviare la stampa del PDF.'); return }
      try { fw.focus(); fw.print() } finally { window.setTimeout(cleanup, 1200) }
    }

    frame.srcdoc = html
    document.body.appendChild(frame)
  }

  const handlePrintLessonPdf = async () => {
    if (!lessonEntries.length && !lessonImages.length) {
      window.alert('Non ci sono ancora contenuti da stampare.')
      return
    }

    setIsPrinting(true)
    const nowLabel = formatPrintDate(new Date().toISOString())

    let summaryText = ''
    try {
      const data = await postJson('/api/summarize-lesson', {
        entries: lessonEntries,
        classLevel: profile.classLevel,
        subject: profile.subject,
        area: selectedArea,
        studentName: profile.studentName
      })
      summaryText = data.summary || ''
    } catch (error) {
      console.error('Errore generazione riassunto lezione:', error)
    } finally {
      setIsPrinting(false)
    }

    buildAndPrintPdf(summaryText, nowLabel)
  }

  const pickPreferredItalianVoice = () => {
    if (!('speechSynthesis' in window)) return null

    const voices = window.speechSynthesis.getVoices()
    const italianVoices = voices.filter((voice) => voice.lang?.toLowerCase().startsWith('it'))

    if (!italianVoices.length) return null

    const scoreVoice = (voice) => {
      const name = voice.name.toLowerCase()
      let score = 0
      const isMale = name.includes('male') || name.includes('maschio') || name.includes('man') || name.includes('diego') || name.includes('cosimo') || name.includes('giuseppe')
      const isYoung = name.includes('young') || name.includes('teen') || name.includes('boy') || name.includes('junior')
      const isFemale = name.includes('female') || name.includes('femmina') || name.includes('woman') || name.includes('girl') || name.includes('lucia') || name.includes('elsa') || name.includes('isabella')

      if (voice.lang === 'it-IT') score += 8
      if (!voice.localService) score += 4
      if (name.includes('natural') || name.includes('neural') || name.includes('online')) score += 10
      if (name.includes('enhanced') || name.includes('premium') || name.includes('hq')) score += 4
      if (name.includes('google')) score += 5
      if (name.includes('microsoft')) score += 5
      if (isMale) score += 16
      if (isYoung) score += 7
      if (isMale && isYoung) score += 6
      if (isFemale) score -= 18
      if (name.includes('espeak') || name.includes('compact') || name.includes('legacy') || name.includes('sapi')) score -= 10
      if (voice.default) score += 1

      return score
    }

    const rankedVoices = [...italianVoices].sort((left, right) => scoreVoice(right) - scoreVoice(left))

    return rankedVoices[0] || italianVoices[0]
  }

  const splitSpeechTextIntoChunks = (value) => {
    const text = String(value || '').trim()
    if (!text) return []

    const sentences = text
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean)

    const chunks = []
    let currentChunk = ''

    sentences.forEach((sentence) => {
      const nextChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence
      if (nextChunk.length > 340 && currentChunk) {
        chunks.push(currentChunk)
        currentChunk = sentence
      } else {
        currentChunk = nextChunk
      }
    })

    if (currentChunk) {
      chunks.push(currentChunk)
    }

    return chunks
  }

  const speakText = (text) => {
    if (!('speechSynthesis' in window) || !text) return

    window.speechSynthesis.cancel()
    const preferredVoice = pickPreferredItalianVoice()
    const chunks = text.length > 260 ? splitSpeechTextIntoChunks(text) : [text]

    chunks.forEach((chunk) => {
      const utterance = new SpeechSynthesisUtterance(chunk)
      const voiceName = preferredVoice?.name?.toLowerCase() || ''
      const isLikelyMaleVoice = voiceName.includes('male') || voiceName.includes('maschio') || voiceName.includes('man') || voiceName.includes('diego') || voiceName.includes('cosimo') || voiceName.includes('giuseppe')
      const isLikelyYoungVoice = voiceName.includes('young') || voiceName.includes('teen') || voiceName.includes('boy') || voiceName.includes('junior')
      const isLikelyNaturalVoice = voiceName.includes('natural') || voiceName.includes('neural') || voiceName.includes('online') || voiceName.includes('enhanced') || voiceName.includes('premium')

      utterance.lang = 'it-IT'
      utterance.rate = isLikelyMaleVoice
        ? (isLikelyYoungVoice ? (isLikelyNaturalVoice ? 1.04 : 1.01) : (isLikelyNaturalVoice ? 1 : 0.97))
        : (isLikelyNaturalVoice ? 1.01 : 0.98)
      utterance.pitch = isLikelyMaleVoice
        ? (isLikelyYoungVoice ? 1.03 : 0.97)
        : 1
      utterance.volume = 1

      if (preferredVoice) {
        utterance.voice = preferredVoice
        utterance.lang = preferredVoice.lang
      }

      window.speechSynthesis.speak(utterance)
    })
  }

  const markdownToSpeechText = (value) => {
    return String(value || '')
      .replace(/```[\s\S]*?```/g, ' ') // code block
      .replace(/`([^`]+)`/g, '$1') // inline code
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // markdown image
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // markdown link
      .replace(/^\s{0,3}#{1,6}\s+/gm, '') // headings
      .replace(/^\s*[-*+]\s+/gm, '') // unordered list markers
      .replace(/^\s*\d+\.\s+/gm, '') // ordered list markers
      .replace(/[|]/g, ' ') // table separators
      .replace(/[*_~>#]/g, '') // emphasis and quote markers
      .replace(/\n{2,}/g, '. ') // paragraph pause
      .replace(/\n/g, ', ') // short pause on line break
      .replace(/\s+([,.;!?])/g, '$1') // no spaces before punctuation
      .replace(/\s+/g, ' ')
      .trim()
  }

  const setSpeakingMessage = (message, action = 'speaking', options = {}) => {
    addLessonEntry('Amico', message)
    addLessonImages(options.images, 'Risposta AI')
    setBotMessage(message)
    setBoardImages(Array.isArray(options.images) ? options.images : [])
    setBotAction(action)
    speakText(markdownToSpeechText(message))
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setBotAction('idle'), 2500)
  }

  const requestVisualsAsync = async ({ message, reply, visualPlan }) => {
    if (!(selectedArea === 'study' || selectedArea === 'review')) return

    const requestId = Date.now()
    latestVisualRequestRef.current = requestId
    setIsVisualLoading(true)

    try {
      const data = await postJson('/api/generate-visuals', {
        area: selectedArea,
        classLevel: profile.classLevel,
        subject: profile.subject,
        message,
        reply,
        imagePrompt: visualPlan?.imagePrompt,
        visualType: visualPlan?.visualType,
        visualQuery: visualPlan?.visualQuery,
        needsSchema: visualPlan?.needsSchema,
        schemaType: visualPlan?.schemaType,
        schemaTitle: visualPlan?.schemaTitle,
        schemaPoints: visualPlan?.schemaPoints
      })

      if (latestVisualRequestRef.current !== requestId) return

      const nextImages = Array.isArray(data.imagePreviews) ? data.imagePreviews.slice(0, 4) : []
      if (nextImages.length) {
        addLessonImages(nextImages, 'Visuale generata')
        setBoardImages(nextImages)
      } else {
        setBoardImages([])
      }
    } catch (error) {
      console.error('Errore generazione visual asincrona:', error)
    } finally {
      if (latestVisualRequestRef.current === requestId) {
        setIsVisualLoading(false)
      }
    }
  }

  const postJson = async (url, payload) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Errore richiesta API')
    }
    return data
  }

  const extractValue = async (type, inputText) => {
    const data = await postJson('/api/extract', { type, text: inputText })
    return (data.value || inputText).trim()
  }

  const inferSubjectFromTopic = async (topic, currentSubject = '') => {
    const prompt = currentSubject
      ? `Materia attuale: ${currentSubject}. Nuovo argomento: ${topic}. Qual e la materia scolastica piu adatta a questo argomento?`
      : topic

    const inferredSubject = await extractValue('subject', prompt)
    return inferredSubject || currentSubject
  }

  const resetQuizState = () => {
    setQuizQuestions([])
    setQuestionIndex(0)
    setAnswers([])
  }

  const buildWelcomeForArea = (areaId, userProfile) => {
    const name = userProfile.studentName || 'campione'
    const subject = userProfile.subject || 'la materia scelta'

    if (areaId === 'quiz') {
      return `Perfetto ${name}! Modalita quiz interattivo attiva su ${subject}. Dimmi l'argomento e iniziamo con 5 domande.`
    }

    if (areaId === 'review') {
      return `Ottimo ${name}! Siamo in area Ripasso su ${subject}. Scrivimi cosa vuoi ripassare e ti aiuto con spiegazioni chiare.`
    }

    return `Ciao ${name}! Siamo in area Studiamo insieme su ${subject}. Fammi una domanda o scrivi un argomento da approfondire.`
  }

  const startStudio = (areaId, userProfile) => {
    setIsStudioReady(true)
    setSelectedArea(areaId)
    setConversationHistory([])
    setBoardImages([])
    setLessonEntries([])
    setLessonImages([])
    resetQuizState()

    if (areaId === 'quiz') {
      setInteractionPhase('askTopic')
    } else {
      setInteractionPhase('chat')
    }

    setSpeakingMessage(buildWelcomeForArea(areaId, userProfile), 'happy')
  }

  const startQuiz = async (classLevel, subject, topic) => {
    const quizData = await postJson('/api/generate-quiz', { classLevel, subject, topic })
    const questions = Array.isArray(quizData.questions) ? quizData.questions.slice(0, 5) : []
    if (questions.length < 5) {
      throw new Error('Non sono riuscito a generare 5 domande. Riprova.')
    }

    setQuizQuestions(questions)
    setQuestionIndex(0)
    setAnswers([])
    setInteractionPhase('quiz')
    setSpeakingMessage(`Perfetto, iniziamo!\n\nDomanda 1/5:\n${questions[0]}`)
  }

  const evaluateQuiz = async (qa, classLevel, subject, topic) => {
    const result = await postJson('/api/evaluate-quiz', {
      classLevel,
      subject,
      topic,
      qa
    })

    const mapScoreToGrade = (score) => {
      const numeric = Number(score)
      if (!Number.isFinite(numeric)) return 'Sufficiente'
      if (numeric <= 4) return 'Insufficiente'
      if (numeric <= 6) return 'Sufficiente'
      if (numeric < 8) return 'Discreto'
      if (numeric < 9) return 'Buono'
      if (numeric < 10) return 'Distinto'
      return 'Ottimo'
    }

    const finalGrade = result.grade || mapScoreToGrade(result.score)

    const lines = []
    lines.push(`Hai completato il quiz su "${topic}".`)
    lines.push(`Voto finale: ${finalGrade}`)
    if (typeof result.evaluatedCount === 'number' && typeof result.skippedCount === 'number') {
      lines.push(`Domande valutate: ${result.evaluatedCount} · Non valutate: ${result.skippedCount}`)
    }
    lines.push('')

    result.results.forEach((item, idx) => {
      const status = item.isSkipped ? 'Non valutata' : (item.isCorrect ? 'Corretta' : 'Da migliorare')
      lines.push(`Domanda ${idx + 1}: ${status}`)
      lines.push(`- ${item.feedback}`)
      lines.push('')
    })

    if (result.summary) {
      lines.push(`Sintesi: ${result.summary}`)
      lines.push('')
    }

    if (result.resourceSummary) {
      lines.push(`Approfondimento: ${result.resourceSummary}`)
      lines.push('')
    }

    lines.push('Vuoi altre domande sullo stesso argomento o vuoi cambiare argomento?')

    setInteractionPhase('finished')
    setSpeakingMessage(lines.join('\n'), 'speaking', { images: result.imagePreviews || [] })
  }

  const handleNameSubmit = (event) => {
    event.preventDefault()
    const safeName = nameInput.trim()
    if (!safeName) return

    setProfile((prev) => ({ ...prev, studentName: safeName }))
    setOnboardingStep('class')
  }

  const handleClassSelect = (classLevel) => {
    setProfile((prev) => ({
      ...prev,
      classLevel,
      subject: '',
      topic: ''
    }))
    setOnboardingStep('area')
  }

  const handleAreaSelect = (areaId) => {
    setSelectedArea(areaId)
    setOnboardingStep('subject')
  }

  const handleSubjectSubmit = async (event) => {
    event.preventDefault()
    const typedSubject = subjectInput.trim()
    if (!typedSubject) return

    const safeSubject = await extractValue('subject', typedSubject)
    const updatedProfile = {
      ...profile,
      subject: safeSubject || typedSubject,
      topic: ''
    }

    setProfile(updatedProfile)
    setSubjectInput('')
    startStudio(selectedArea, updatedProfile)
  }

  const handleSwitchArea = (areaId) => {
    const updatedProfile = {
      ...profile,
      topic: ''
    }

    setProfile(updatedProfile)
    startStudio(areaId, updatedProfile)
  }

  const handleChangeClass = () => {
    resetQuizState()
    setIsStudioReady(false)
    setOnboardingStep('class')
    setSubjectInput('')
  }

  const handleChangeSubject = () => {
    resetQuizState()
    setProfile((prev) => ({ ...prev, topic: '' }))
    setIsStudioReady(false)
    setOnboardingStep('subject')
  }

  const sendMessage = async (userInput) => {
    if (!userInput.trim()) return

    addLessonEntry('Studente', userInput)

    setIsThinking(true)
    setBotAction('thinking')
    setBotMessage('Sto pensando...')

    try {
      if (interactionPhase === 'askTopic') {
        const topic = await extractValue('topic', userInput)
        const subject = await inferSubjectFromTopic(topic, profile.subject)
        const updatedProfile = { ...profile, subject, topic }
        setProfile(updatedProfile)
        await startQuiz(updatedProfile.classLevel, updatedProfile.subject, topic)
      } else if (interactionPhase === 'quiz') {
        const currentQuestion = quizQuestions[questionIndex]
        const nextAnswers = [...answers, { question: currentQuestion, answer: userInput }]
        setAnswers(nextAnswers)

        if (questionIndex < 4) {
          const nextIndex = questionIndex + 1
          setQuestionIndex(nextIndex)
          setSpeakingMessage(`Domanda ${nextIndex + 1}/5:\n${quizQuestions[nextIndex]}`)
        } else {
          await evaluateQuiz(nextAnswers, profile.classLevel, profile.subject, profile.topic)
        }
      } else if (interactionPhase === 'finished') {
        const normalized = userInput.toLowerCase()
        const wantsSame = /(stesso|stessa|altre|ancora|continua|si|sì)/.test(normalized)
        const wantsChange = /(cambia|nuovo|nuova|altro argomento|cambiare)/.test(normalized)

        if (wantsSame) {
          await startQuiz(profile.classLevel, profile.subject, profile.topic)
        } else if (wantsChange) {
          setInteractionPhase('askTopic')
          resetQuizState()
          setProfile((prev) => ({ ...prev, topic: '' }))
          setSpeakingMessage('Va bene, cambiamo argomento. Su cosa vuoi essere interrogato adesso?')
        } else {
          setSpeakingMessage('Dimmi "stesso argomento" se vuoi altre domande, oppure "cambiare argomento".')
        }
      } else {
        // Aggiorna il badge argomento in modalita studio/ripasso senza bloccare la risposta chat.
        const quickTopic = userInput
          .trim()
          .split(/[.!?\n]/)[0]
          .slice(0, 90)

        if (quickTopic) {
          setProfile((prev) => ({ ...prev, topic: quickTopic }))
        }

        extractValue('topic', userInput)
          .then((topicValue) => {
            const cleanedTopic = (topicValue || '').trim()
            if (cleanedTopic) {
              setProfile((prev) => ({ ...prev, topic: cleanedTopic }))
            }
          })
          .catch((topicError) => {
            console.error('Errore estrazione topic chat:', topicError)
          })

        const data = await postJson('/api/chat', {
          message: userInput,
          conversationHistory: conversationHistory.slice(-8),
          area: selectedArea,
          classLevel: profile.classLevel,
          subject: profile.subject,
          studentName: profile.studentName
        })

        const reply = (data.reply || 'Prova a riformulare la domanda in modo piu preciso.').trim()
        setConversationHistory((prev) => {
          const next = [...prev, { role: 'user', content: userInput }, { role: 'assistant', content: reply }]
          return next.slice(-12)
        })
        setSpeakingMessage(reply)

        requestVisualsAsync({
          message: userInput,
          reply,
          visualPlan: {
            imagePrompt: data.imagePrompt,
            visualType: data.visualType,
            visualQuery: data.visualQuery,
            needsSchema: data.needsSchema,
            schemaType: data.schemaType,
            schemaTitle: data.schemaTitle,
            schemaPoints: data.schemaPoints
          }
        })
      }
    } catch (error) {
      console.error('Errore:', error)
      const errorMsg = 'Mi dispiace, ho avuto un problema. Puoi riprovare?'
      setSpeakingMessage(errorMsg, 'confused')
    }

    setIsThinking(false)
  }

  const renderOnboarding = () => {
    if (onboardingStep === 'name') {
      return (
        <section className="onboarding-card">
          <h1>Benvenuto in AI Studio Amico</h1>
          <p>Prima di iniziare, scrivi il tuo nome.</p>
          <form onSubmit={handleNameSubmit} className="onboarding-form">
            <input
              type="text"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="Es. Luca"
              className="onboarding-input"
              maxLength={40}
              autoFocus
            />
            <button type="submit" className="onboarding-primary-button" disabled={!nameInput.trim()}>
              Continua
            </button>
          </form>
        </section>
      )
    }

    if (onboardingStep === 'class') {
      return (
        <section className="onboarding-card">
          <h2>Ciao {profile.studentName}, seleziona la tua classe</h2>
          <div className="class-grid" role="list" aria-label="Scelta classe">
            {CLASS_OPTIONS.map((className) => (
              <button
                key={className}
                type="button"
                className={`class-option ${profile.classLevel === className ? 'selected' : ''}`}
                onClick={() => handleClassSelect(className)}
              >
                {className}
              </button>
            ))}
          </div>
        </section>
      )
    }

    if (onboardingStep === 'area') {
      return (
        <section className="onboarding-card">
          <h2>Scegli l'area di lavoro</h2>
          <p>Seleziona una delle tre modalita per continuare.</p>
          <div className="area-grid" role="list" aria-label="Aree disponibili">
            {LEARNING_AREAS.map((area) => (
              <button
                key={area.id}
                type="button"
                className="area-option"
                onClick={() => handleAreaSelect(area.id)}
              >
                <span className="area-icon" aria-hidden="true">{area.icon}</span>
                <span className="area-title">{area.label}</span>
                <span className="area-description">{area.description}</span>
              </button>
            ))}
          </div>
        </section>
      )
    }

    return (
      <section className="onboarding-card">
        <h2>Ultimo passo: scegli la materia</h2>
        <p>Area selezionata: <strong>{getAreaLabel(selectedArea)}</strong></p>
        <form onSubmit={handleSubjectSubmit} className="onboarding-form">
          <input
            type="text"
            value={subjectInput}
            onChange={(event) => setSubjectInput(event.target.value)}
            placeholder="Es. Matematica, Scienze, Italiano"
            className="onboarding-input"
            maxLength={80}
            autoFocus
          />
          <button type="submit" className="onboarding-primary-button" disabled={!subjectInput.trim()}>
            Apri studio
          </button>
        </form>
      </section>
    )
  }

  if (!isStudioReady) {
    return (
      <div className="app-container onboarding-mode">
        <div className="onboarding-wrap">
          <div className="page-logo-wrap" aria-label="AI Studio Amico">
            <img src="/logo.png" alt="AI Studio Amico" className="page-logo" />
          </div>
          {renderOnboarding()}
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="page-logo-wrap" aria-label="AI Studio Amico">
          <img src="/logo.png" alt="AI Studio Amico" className="page-logo" />
        </div>
        <div className="scene">
          <div className="whiteboard-stage">
            <div className={`progress-badge ${isBadgeActive ? 'is-active' : 'is-inactive'}`}>
              {getBadgeLabel()}
            </div>
            <div className="whiteboard-layout">
              <div className="board-column">
                <Whiteboard text={botMessage} images={boardImages} isVisualLoading={isVisualLoading} />

                <div className="topic-badge-wrap">
                  <div className="topic-badge">
                    <span className="topic-badge-label">Argomento selezionato</span>
                    <span className="topic-badge-value">{profile.topic || '---'}</span>
                  </div>
                </div>

                <InputArea onSendMessage={sendMessage} isLoading={isThinking} />
              </div>

              <div className="side-column">
                <aside className="level-card">
                  <h3>Profilo studio</h3>
                  <div className="level-row">
                    <p><strong>Nome:</strong> {profile.studentName || '---'}</p>
                  </div>
                  <div className="level-row">
                    <p><strong>Classe:</strong> {profile.classLevel || '---'}</p>
                    <button
                      type="button"
                      className="level-action-button"
                      onClick={handleChangeClass}
                    >
                      Cambia classe
                    </button>
                  </div>
                  <div className="level-row">
                    <p><strong>Materia:</strong> {profile.subject || '---'}</p>
                    <button
                      type="button"
                      className="level-action-button"
                      onClick={handleChangeSubject}
                    >
                      Cambia materia
                    </button>
                  </div>
                  <div className="level-row area-row">
                    <p><strong>Area:</strong> {getAreaLabel()}</p>
                  </div>

                  <div className="mini-area-switch" role="group" aria-label="Cambia area">
                    {LEARNING_AREAS.map((area) => (
                      <button
                        key={area.id}
                        type="button"
                        className={`mini-area-button ${selectedArea === area.id ? 'is-selected' : ''}`}
                        onClick={() => handleSwitchArea(area.id)}
                      >
                        <span aria-hidden="true">{area.icon}</span>
                        {area.label}
                      </button>
                    ))}
                  </div>

                  <div className="lesson-actions">
                    <button
                      type="button"
                      className="level-action-button lesson-print-button"
                      onClick={handlePrintLessonPdf}
                      disabled={isPrinting || (!lessonEntries.length && !lessonImages.length)}
                    >
                      {isPrinting ? 'Sto generando il riassunto…' : 'Fine lezione · Stampa PDF'}
                    </button>
                  </div>
                </aside>

                <div className="side-bot-wrap">
                  <Bot action={botAction} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App