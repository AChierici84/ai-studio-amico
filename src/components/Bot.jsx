import React, { useEffect, useState } from 'react'
import './Bot.css'

function Bot({ action = 'idle' }) {
  const [botX, setBotX] = useState(10) // % orizzontale
  const [gesture, setGesture] = useState('none')
  const [expression, setExpression] = useState('neutral')

  // Movimento orizzontale sul bordo inferiore con pause casuali
  useEffect(() => {
    let timer = null
    let active = true

    const run = () => {
      if (!active) return

      // Pausa tra uno spostamento e il successivo
      const pauseMs = 1200 + Math.random() * 2200
      timer = setTimeout(() => {
        if (!active) return

        // Nuova posizione sul bordo inferiore della lavagna
        setBotX(Math.random() * 80 + 5) // da 5% a 85%

        // Tempo di percorrenza prima della prossima pausa
        timer = setTimeout(run, 1700)
      }, pauseMs)
    }

    run()

    return () => {
      active = false
      if (timer) clearTimeout(timer)
    }
  }, [])

  // Cambio espressione e gesticulazione in base all'azione
  useEffect(() => {
    switch (action) {
      case 'thinking':
        setExpression('thinking')
        setGesture('thinking')
        break
      case 'speaking':
        setExpression('happy')
        setGesture('gesturing')
        break
      case 'confused':
        setExpression('confused')
        setGesture('confused')
        break
      case 'happy':
        setExpression('happy')
        setGesture('waving')
        break
      default:
        setExpression('neutral')
        setGesture('idle')
    }
  }, [action])

  // Gesticulazione periodica mentre parla
  useEffect(() => {
    if (action === 'speaking') {
      const gestureInterval = setInterval(() => {
        const gestures = ['gesturing', 'waving', 'pointing']
        setGesture(gestures[Math.floor(Math.random() * gestures.length)])
      }, 800)

      return () => clearInterval(gestureInterval)
    }
  }, [action])

  return (
    <div className="bot-container" aria-hidden="true">
      <div
        className={`bot ${gesture} ${expression}`}
        style={{
          left: `${botX}%`,
          transition: 'left 1.8s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <img src="/bot.png" alt="Amico Bot" className="bot-body" />

        {/* Braccio sinistro - stessa immagine ritagliata sull'area braccio */}
        <img src="/bot.png" alt="" className={`bot-arm-left ${gesture}`} />
        {/* Braccio destro */}
        <img src="/bot.png" alt="" className={`bot-arm-right ${gesture}`} />
        {/* Bocca - ritagliata sull'area bocca */}
        <img src="/bot.png" alt="" className={`bot-mouth ${expression}`} />

        {/* Bolle parlanti */}
        {action === 'speaking' && (
          <>
            <div className="bubble bubble-1"></div>
            <div className="bubble bubble-2"></div>
            <div className="bubble bubble-3"></div>
          </>
        )}

        {/* Indicatore pensiero */}
        {action === 'thinking' && (
          <div className="think-dots">
            <span></span><span></span><span></span>
          </div>
        )}
      </div>
    </div>
  )
}

export default Bot
