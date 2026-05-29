import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

const API = 'http://localhost:8000'

const SUGGESTIONS = [
  'What key skills am I missing for this role?',
  'Rewrite my professional summary to match this job.',
  'What are my strongest relevant skills for this position?',
  'Which of my projects are most relevant to highlight?',
  'What keywords from the JD should I add to my CV?',
]

export default function ChatPanel({ companies }) {
  const [messages, setMessages] = useState([])
  const [query, setQuery] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()
  const textareaRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendQuery = async (q = query) => {
    const trimmed = q.trim()
    if (!trimmed || loading) return

    const userMsg = { role: 'user', text: trimmed, company }
    setMessages(prev => [...prev, userMsg])
    setQuery('')
    setLoading(true)

    try {
      const res = await fetch(`${API}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, company_name: company }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Query failed')

      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.answer,
        meta: {
          cv_chunks: data.cv_chunks_used,
          jd_chunks: data.jd_chunks_used,
          company: data.company_filter,
        }
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'error',
        text: err.message,
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendQuery()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {messages.length === 0 && (
          <EmptyState companies={companies} onSuggest={(s) => { setQuery(s); textareaRef.current?.focus() }} />
        )}
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        borderTop: '1px solid #2e2e36',
        padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 10,
        background: '#0d0d0f',
      }}>
        {/* Company selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5a5a6e', whiteSpace: 'nowrap' }}>
            Target company
          </span>
          <select
            value={company}
            onChange={e => setCompany(e.target.value)}
            style={{
              flex: 1, background: '#1c1c21', border: '1px solid #2e2e36',
              borderRadius: 7, padding: '6px 10px', color: company ? '#3ecf8e' : '#5a5a6e',
              fontSize: '0.85rem',
            }}
          >
            <option value="">Any / no filter</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Textarea + send */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about skill gaps, request rewrites, or get interview tips…"
            rows={2}
            style={{
              flex: 1, background: '#1c1c21', border: '1px solid #2e2e36',
              borderRadius: 10, padding: '12px 14px', color: '#e8e8f0',
              fontSize: '0.92rem', resize: 'none', lineHeight: 1.5,
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = '#7c6af7'}
            onBlur={e => e.target.style.borderColor = '#2e2e36'}
          />
          <button
            onClick={() => sendQuery()}
            disabled={loading || !query.trim()}
            style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: loading || !query.trim() ? '#2e2e36' : 'linear-gradient(135deg, #7c6af7, #5b4ee0)',
              color: loading || !query.trim() ? '#5a5a6e' : '#fff',
              fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: loading || !query.trim() ? 'none' : '0 4px 16px rgba(124,106,247,0.35)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? <Spinner /> : '↑'}
          </button>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#3a3a44', textAlign: 'right' }}>Enter to send · Shift+Enter for new line</div>
      </div>
    </div>
  )
}

function Message({ msg }) {
  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          maxWidth: '75%', background: 'rgba(124,106,247,0.15)',
          border: '1px solid rgba(124,106,247,0.25)',
          borderRadius: '14px 14px 4px 14px',
          padding: '10px 16px', animation: 'fadeUp 0.2s ease',
        }}>
          <div style={{ fontSize: '0.9rem', color: '#e8e8f0', lineHeight: 1.5 }}>{msg.text}</div>
          {msg.company && (
            <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#7c6af7' }}>@ {msg.company}</div>
          )}
        </div>
      </div>
    )
  }

  if (msg.role === 'error') {
    return (
      <div style={{
        background: 'rgba(242,100,100,0.08)', border: '1px solid rgba(242,100,100,0.25)',
        borderRadius: 10, padding: '12px 16px', color: '#f26464', fontSize: '0.88rem',
        animation: 'fadeUp 0.2s ease',
      }}>
        ⚠ {msg.text}
      </div>
    )
  }

  // Assistant
  return (
    <div style={{ animation: 'fadeUp 0.25s ease' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, #7c6af7, #3ecf8e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', color: '#fff', fontWeight: 700,
        }}>HR</div>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#7c6af7', fontFamily: 'Syne, sans-serif' }}>Career Coach</span>
        {msg.meta && (
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {msg.meta.cv_chunks > 0 && <Chip label={`CV ×${msg.meta.cv_chunks}`} color="#a596ff" />}
            {msg.meta.jd_chunks > 0 && <Chip label={`JD ×${msg.meta.jd_chunks}`} color="#3ecf8e" />}
          </div>
        )}
      </div>
      <div style={{
        background: '#141417', border: '1px solid #2e2e36',
        borderRadius: '4px 14px 14px 14px', padding: '14px 18px',
      }}>
        <div className="answer-body">
          <ReactMarkdown>{msg.text}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

function Chip({ label, color }) {
  return (
    <span style={{
      background: `${color}18`, color, border: `1px solid ${color}33`,
      borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600,
    }}>{label}</span>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '4px 0' }}>
      {[0, 0.2, 0.4].map((delay, i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#7c6af7', animation: `pulse 1s ease-in-out ${delay}s infinite`,
        }} />
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 16, height: 16, border: '2px solid #5a5a6e',
      borderTopColor: '#fff', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

function EmptyState({ companies, onSuggest }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'linear-gradient(135deg, #7c6af7, #3ecf8e)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.5rem', marginBottom: 16, boxShadow: '0 8px 32px rgba(124,106,247,0.3)',
      }}>🎯</div>
      <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.05rem', marginBottom: 8 }}>Ask your career coach</h3>
      <p style={{ color: '#5a5a6e', fontSize: '0.88rem', maxWidth: 320, marginBottom: 24, lineHeight: 1.6 }}>
        {companies.length === 0
          ? 'Upload your CV and some job descriptions to get started.'
          : 'Select a company above and ask about skill gaps, rewrites, or interview prep.'}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 480 }}>
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => onSuggest(s)}
            style={{
              background: '#1c1c21', border: '1px solid #2e2e36',
              borderRadius: 20, padding: '7px 14px',
              color: '#9898aa', fontSize: '0.82rem',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = '#7c6af7'; e.target.style.color = '#a596ff' }}
            onMouseLeave={e => { e.target.style.borderColor = '#2e2e36'; e.target.style.color = '#9898aa' }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
