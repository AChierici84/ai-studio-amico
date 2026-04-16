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

  const pickPreferredItalianVoice = () => {
    if (!('speechSynthesis' in window)) return null

    const voices = window.speechSynthesis.getVoices()
    const italianVoices = voices.filter((voice) => voice.lang?.toLowerCase().startsWith('it'))

    if (!italianVoices.length) return null

    const preferredMatch = italianVoices.find((voice) => {
      const name = voice.name.toLowerCase()
      return name.includes('female') || name.includes('lucia') || name.includes('elsa') || name.includes('cosimo')
    })

    return preferredMatch || italianVoices[0]
  }

  const speakText = (text) => {
    if (!('speechSynthesis' in window) || !text) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const preferredVoice = pickPreferredItalianVoice()

    utterance.lang = 'it-IT'
    utterance.rate = 1.05
    utterance.pitch = 1.6

    if (preferredVoice) {
      utterance.voice = preferredVoice
      utterance.lang = preferredVoice.lang
    }

    window.speechSynthesis.speak(utterance)
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
      .replace(/\s+/g, ' ')
      .trim()
  }

  const setSpeakingMessage = (message, action = 'speaking', options = {}) => {
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

    try {
      const data = await postJson('/api/generate-visuals', {
        area: selectedArea,
        classLevel: profile.classLevel,
        subject: profile.subject,
        message,
        reply,
        visualQuery: visualPlan?.visualQuery,
        needsSchema: visualPlan?.needsSchema,
        schemaType: visualPlan?.schemaType,
        schemaTitle: visualPlan?.schemaTitle,
        schemaPoints: visualPlan?.schemaPoints
      })

      if (latestVisualRequestRef.current !== requestId) return

      const nextImages = Array.isArray(data.imagePreviews) ? data.imagePreviews.slice(0, 4) : []
      if (nextImages.length) {
        setBoardImages(nextImages)
      }
    } catch (error) {
      console.error('Errore generazione visual asincrona:', error)
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
                <Whiteboard text={botMessage} images={boardImages} />

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