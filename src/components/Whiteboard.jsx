import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './Whiteboard.css'

function Whiteboard({ text, images = [] }) {
  const safeImages = Array.isArray(images) ? images.filter(Boolean).slice(0, 4) : []

  return (
    <div className="whiteboard">
      <div className="whiteboard-content">
        <div className="whiteboard-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {text || ''}
          </ReactMarkdown>
        </div>
        {safeImages.length > 0 && (
          <div className="whiteboard-previews" aria-label="Anteprime immagini suggerite">
            {safeImages.map((src, idx) => (
              <figure className="preview-card" key={`${src}-${idx}`}>
                <img src={src} alt={`Anteprima didattica ${idx + 1}`} loading="lazy" />
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Whiteboard
