import React, { useState, useRef } from 'react'
import Bot from './components/Bot'
import Whiteboard from './components/Whiteboard'
import InputArea from './components/InputArea'
import './App.css'

function App() {
  const [botMessage, setBotMessage] = useState('Ciao! Sono Micky, il tuo assistente. Prima di iniziare, che classe fai?')
  const [isThinking, setIsThinking] = useState(false)
  const [botAction, setBotAction] = useState('idle') // idle, thinking, speaking, happy, confused
  const [phase, setPhase] = useState('askClass') // askClass | askSubject | askTopic | quiz | finished
  const [profile, setProfile] = useState({
    classLevel: '',
    subject: '',
    topic: ''
  })
  const [quizQuestions, setQuizQuestions] = useState([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const timeoutRef = useRef(null)

  const getBadgeLabel = () => {
    if (phase === 'askClass') return 'Step 1 di 3 · Classe'
    if (phase === 'askSubject') return 'Step 2 di 3 · Materia'
    if (phase === 'askTopic') return 'Step 3 di 3 · Argomento'
    if (phase === 'quiz') return `Domanda ${questionIndex + 1} di 5`
    if (phase === 'finished') return 'Quiz completato'
    return 'Percorso guidato'
  }

  const isBadgeActive = phase === 'quiz'

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

  const setSpeakingMessage = (message, action = 'speaking') => {
    setBotMessage(message)
    setBotAction(action)
    speakText(message)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setBotAction('idle'), 2500)
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

  const startQuiz = async (classLevel, subject, topic) => {
    const quizData = await postJson('/api/generate-quiz', { classLevel, subject, topic })
    const questions = Array.isArray(quizData.questions) ? quizData.questions.slice(0, 5) : []
    if (questions.length < 5) {
      throw new Error('Non sono riuscito a generare 5 domande. Riprova.')
    }

    setQuizQuestions(questions)
    setQuestionIndex(0)
    setAnswers([])
    setPhase('quiz')
    setSpeakingMessage(`Perfetto, iniziamo!\n\nDomanda 1/5:\n${questions[0]}`)
  }

  const evaluateQuiz = async (qa, classLevel, subject, topic) => {
    const result = await postJson('/api/evaluate-quiz', {
      classLevel,
      subject,
      topic,
      qa
    })

    const lines = []
    lines.push(`Hai completato il quiz su "${topic}".`)
    lines.push(`Voto finale: ${result.score}/10`)
    lines.push('')

    result.results.forEach((item, idx) => {
      const status = item.isCorrect ? 'Corretta' : 'Da migliorare'
      lines.push(`Domanda ${idx + 1}: ${status}`)
      lines.push(`- ${item.feedback}`)
      lines.push('')
    })

    if (result.summary) {
      lines.push(`Sintesi: ${result.summary}`)
      lines.push('')
    }

    lines.push('Vuoi altre domande sullo stesso argomento o vuoi cambiare argomento?')

    setPhase('finished')
    setSpeakingMessage(lines.join('\n'))
  }

  const resetQuizState = () => {
    setQuizQuestions([])
    setQuestionIndex(0)
    setAnswers([])
  }

  const handleChangeClass = () => {
    resetQuizState()
    setProfile({
      classLevel: '',
      subject: '',
      topic: ''
    })
    setPhase('askClass')
    setSpeakingMessage('Va bene, ripartiamo dalla classe. Che classe fai?')
  }

  const handleChangeSubject = () => {
    resetQuizState()
    setProfile((prev) => ({
      ...prev,
      subject: '',
      topic: ''
    }))
    setPhase('askSubject')
    setSpeakingMessage('Va bene, scegliamo di nuovo la materia. Quale materia vuoi ripassare insieme?')
  }

  const sendMessage = async (userInput) => {
    if (!userInput.trim()) return

    // Mostra che il bot sta pensando
    setIsThinking(true)
    setBotAction('thinking')
    setBotMessage('Sto pensando...')

    try {
      if (phase === 'askClass') {
        const classLevel = await extractValue('class', userInput)
        setProfile((prev) => ({ ...prev, classLevel }))
        setPhase('askSubject')
        setSpeakingMessage('Ottimo! Adesso dimmi quale materia vuoi ripassare insieme (es. scienze).')
      } else if (phase === 'askSubject') {
        const subject = await extractValue('subject', userInput)
        setProfile((prev) => ({ ...prev, subject }))
        setPhase('askTopic')
        setSpeakingMessage('Perfetto. Su quale argomento vuoi che ti faccia delle domande?')
      } else if (phase === 'askTopic') {
        const topic = await extractValue('topic', userInput)
        const subject = await inferSubjectFromTopic(topic, profile.subject)
        const updatedProfile = { ...profile, subject, topic }
        setProfile(updatedProfile)
        await startQuiz(updatedProfile.classLevel, updatedProfile.subject, topic)
      } else if (phase === 'quiz') {
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
      } else if (phase === 'finished') {
        const normalized = userInput.toLowerCase()
        const wantsSame = /(stesso|stessa|altre|ancora|continua|si|sì)/.test(normalized)
        const wantsChange = /(cambia|nuovo|nuova|altro argomento|cambiare)/.test(normalized)

        if (wantsSame) {
          await startQuiz(profile.classLevel, profile.subject, profile.topic)
        } else if (wantsChange) {
          setPhase('askTopic')
          resetQuizState()
          setProfile((prev) => ({ ...prev, topic: '' }))
          setSpeakingMessage('Va bene, cambiamo argomento. Su cosa vuoi essere interrogato adesso?')
        } else {
          setSpeakingMessage('Dimmi "stesso argomento" se vuoi altre domande, oppure "cambiare argomento".')
        }
      }

    } catch (error) {
      console.error('Errore:', error)
      const errorMsg = 'Mi dispiace, ho avuto un problema. Puoi riprovare?'
      setSpeakingMessage(errorMsg, 'confused')
    }

    setIsThinking(false)
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
                <Whiteboard text={botMessage} />

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
                  <h3>Livello di partenza</h3>
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
                      disabled={!profile.classLevel}
                    >
                      Cambia materia
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
