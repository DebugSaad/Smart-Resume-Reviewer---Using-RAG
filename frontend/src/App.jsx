import { useState, useRef } from 'react'
import DocumentPanel from './components/DocumentPanel'
import ChatPanel from './components/ChatPanel'
import UploadModal from './components/UploadModal'

export default function App() {
  const [showUpload, setShowUpload] = useState(false)
  const [companies, setCompanies] = useState([])
  const [toast, setToast] = useState(null)
  const docPanelRef = useRef()

  const handleDocumentsChange = (docs) => {
    const cos = [...new Set(
      docs.filter(d => d.doc_type === 'jd' && d.company_name).map(d => d.company_name)
    )].sort()
    setCompanies(cos)
  }

  const handleUploadSuccess = (data) => {
    setShowUpload(false)
    showToast(`✅ "${data.company_name || data.doc_id}" ingested — ${data.chunks_stored} chunks`)
    DocumentPanel.refresh?.()
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Sidebar */}
      <aside style={{
        width: 280, flexShrink: 0,
        background: '#0d0d0f',
        borderRight: '1px solid #2e2e36',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '22px 20px 16px', borderBottom: '1px solid #2e2e36' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #7c6af7, #3ecf8e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.9rem', color: '#fff', fontWeight: 800, fontFamily: 'Syne, sans-serif',
            }}>HR</div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.95rem', color: '#e8e8f0' }}>Personal HR</div>
              <div style={{ fontSize: '0.72rem', color: '#5a5a6e', marginTop: -1 }}>Smart Resume Reviewer</div>
            </div>
          </div>
        </div>

        {/* Upload button */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #2e2e36' }}>
          <button
            onClick={() => setShowUpload(true)}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 9,
              background: 'linear-gradient(135deg, #7c6af7, #5b4ee0)',
              color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700,
              fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 7, boxShadow: '0 4px 16px rgba(124,106,247,0.3)',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <span style={{ fontSize: '1rem' }}>+</span> Add document
          </button>
        </div>

        {/* Document list */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <DocumentPanel onDocumentsChange={handleDocumentsChange} />
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #2e2e36' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#3ecf8e',
              boxShadow: '0 0 6px #3ecf8e',
            }} />
            <span style={{ fontSize: '0.75rem', color: '#5a5a6e' }}>
              MiniLM-L6-v2 · Llama 3.1 8B · Groq
            </span>
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0d0d0f' }}>
        {/* Header */}
        <header style={{
          padding: '16px 24px',
          borderBottom: '1px solid #2e2e36',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.05rem', fontWeight: 800, color: '#e8e8f0' }}>
              Career Coach
            </h1>
            <p style={{ fontSize: '0.78rem', color: '#5a5a6e', marginTop: 2 }}>
              RAG-powered • {companies.length} companies loaded
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {companies.slice(0, 4).map(c => (
              <span key={c} style={{
                background: 'rgba(62,207,142,0.1)', color: '#3ecf8e',
                border: '1px solid rgba(62,207,142,0.2)',
                borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600,
              }}>{c}</span>
            ))}
            {companies.length > 4 && (
              <span style={{ color: '#5a5a6e', fontSize: '0.78rem', alignSelf: 'center' }}>+{companies.length - 4} more</span>
            )}
          </div>
        </header>

        {/* Chat */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChatPanel companies={companies} />
        </div>
      </main>

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1c1c21', border: '1px solid #3ecf8e',
          color: '#3ecf8e', borderRadius: 10,
          padding: '10px 20px', fontSize: '0.88rem', fontWeight: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'fadeUp 0.2s ease', whiteSpace: 'nowrap', zIndex: 200,
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
