import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './Whiteboard.css'

function Whiteboard({ text, images = [], isVisualLoading = false }) {
  const safeImages = Array.isArray(images) ? images.filter(Boolean).slice(0, 4) : []

  return (
    <div className="whiteboard">
      <div className="whiteboard-content">
        <div className="whiteboard-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {text || ''}
          </ReactMarkdown>
        </div>
        {isVisualLoading && (
          <div className="whiteboard-visual-loader" aria-live="polite" aria-label="Sto generando l'immagine">
            <div className="whiteboard-visual-loader-spinner"></div>
            <span>Sto preparando l'immagine...</span>
          </div>
        )}
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
