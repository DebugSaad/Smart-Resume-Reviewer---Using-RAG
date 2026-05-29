import { useState, useRef } from 'react'

const API = 'http://localhost:8000'

export default function UploadModal({ onClose, onSuccess }) {
  const [docType, setDocType] = useState('cv')
  const [company, setCompany] = useState('')
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  const handleSubmit = async () => {
    if (!file) { setError('Please select a file.'); return }
    if (docType === 'jd' && !company.trim()) { setError('Company name is required for job descriptions.'); return }

    setError('')
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('doc_type', docType)
    fd.append('company_name', company.trim())

    try {
      const res = await fetch(`${API}/ingest`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Upload failed')
      onSuccess(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    background: '#1c1c21',
    border: '1px solid #2e2e36',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#e8e8f0',
    fontSize: '0.9rem',
    transition: 'border-color 0.2s',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#141417', border: '1px solid #2e2e36',
          borderRadius: 16, padding: 28, width: '100%', maxWidth: 460,
          animation: 'fadeUp 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.15rem' }}>Add document</h2>
          <button onClick={onClose} style={{ background: 'none', color: '#5a5a6e', fontSize: '1.3rem', padding: '0 4px' }}>×</button>
        </div>

        {/* Doc type toggle */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Document type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['cv', 'jd'].map(t => (
              <button
                key={t}
                onClick={() => setDocType(t)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8,
                  border: `1px solid ${docType === t ? (t === 'cv' ? '#7c6af7' : '#3ecf8e') : '#2e2e36'}`,
                  background: docType === t ? (t === 'cv' ? 'rgba(124,106,247,0.12)' : 'rgba(62,207,142,0.1)') : 'transparent',
                  color: docType === t ? (t === 'cv' ? '#a596ff' : '#3ecf8e') : '#5a5a6e',
                  fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.15s',
                }}
              >
                {t === 'cv' ? '📄 Resume / CV' : '💼 Job Description'}
              </button>
            ))}
          </div>
        </div>

        {/* Company name (JD only) */}
        {docType === 'jd' && (
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Company name</label>
            <input
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="e.g. Google, Shopify, Meta…"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#7c6af7'}
              onBlur={e => e.target.style.borderColor = '#2e2e36'}
            />
          </div>
        )}

        {/* File drop zone */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>File <span style={{ color: '#5a5a6e' }}>(PDF or TXT)</span></label>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
            style={{
              border: `2px dashed ${dragging ? '#7c6af7' : file ? '#3ecf8e' : '#2e2e36'}`,
              borderRadius: 10, padding: '24px 16px', textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
              background: dragging ? 'rgba(124,106,247,0.06)' : 'transparent',
            }}
          >
            <input
              ref={fileRef} type="file"
              accept=".pdf,.txt,.md"
              style={{ display: 'none' }}
              onChange={e => setFile(e.target.files[0])}
            />
            {file ? (
              <>
                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>✅</div>
                <div style={{ color: '#3ecf8e', fontWeight: 500, fontSize: '0.9rem' }}>{file.name}</div>
                <div style={{ color: '#5a5a6e', fontSize: '0.8rem' }}>{(file.size / 1024).toFixed(0)} KB · click to change</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>📂</div>
                <div style={{ color: '#9898aa', fontSize: '0.9rem' }}>Drop file here or click to browse</div>
                <div style={{ color: '#5a5a6e', fontSize: '0.8rem', marginTop: 4 }}>PDF · TXT · MD</div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(242,100,100,0.1)', border: '1px solid rgba(242,100,100,0.3)', borderRadius: 8, padding: '10px 14px', color: '#f26464', fontSize: '0.85rem', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={uploading}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 8,
            background: uploading ? '#2e2e36' : 'linear-gradient(135deg, #7c6af7, #5b4ee0)',
            color: uploading ? '#5a5a6e' : '#fff',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem',
            transition: 'all 0.2s', boxShadow: uploading ? 'none' : '0 4px 20px rgba(124,106,247,0.3)',
          }}
        >
          {uploading ? 'Ingesting…' : 'Upload & Ingest'}
        </button>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block', marginBottom: 7,
  fontSize: '0.78rem', fontWeight: 600,
  letterSpacing: '0.06em', textTransform: 'uppercase',
  color: '#5a5a6e',
}
