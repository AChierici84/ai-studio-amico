import React from 'react'
import './Whiteboard.css'

function Whiteboard({ text }) {
  return (
    <div className="whiteboard">
      <div className="whiteboard-content">
        <p className="whiteboard-text">{text}</p>
      </div>
    </div>
  )
}

export default Whiteboard
