import React, { useState, useRef, useEffect } from 'react'
import './InputArea.css'
import sendIcon from '../assets/send-icon.svg'

function InputArea({ onSendMessage, isLoading }) {
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  // Inizializza Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.lang = 'it-IT'
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true

      recognitionRef.current.onstart = () => {
        setIsListening(true)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current.onresult = (event) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        setInput(transcript)

        // Se è il risultato finale, invia il messaggio
        if (event.results[event.results.length - 1].isFinal) {
          setTimeout(() => {
            if (transcript.trim()) {
              onSendMessage(transcript)
              setInput('')
            }
          }, 500)
        }
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Errore Speech Recognition:', event.error)
        setIsListening(false)
      }
    }
  }, [onSendMessage])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSendMessage(input)
      setInput('')
    }
  }

  const handleMicClick = () => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop()
      } else {
        recognitionRef.current.start()
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="input-area">
      <form onSubmit={handleSubmit} className="input-form">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scrivi qui o usa il microfono"
          className="text-input"
          rows={3}
          disabled={isLoading}
        />
        
        <button
          type="button"
          onClick={handleMicClick}
          className={`mic-button ${isListening ? 'listening' : ''}`}
          disabled={isLoading}
          title={isListening ? 'In ascolto... Clicca per fermare' : 'Clicca per usare il microfono'}
        >
          <span className="mic-icon">🎤</span>
        </button>

        <button
          type="submit"
          className="send-button"
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? '⏳' : <img src={sendIcon} alt="Invia" className="send-icon-img" />}
        </button>
      </form>

      {isListening && (
        <div className="listening-indicator">
          <div className="pulse"></div>
          <span>In ascolto...</span>
        </div>
      )}
    </div>
  )
}

export default InputArea
