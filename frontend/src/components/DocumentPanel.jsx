import { useState, useEffect } from 'react'

const API = 'http://localhost:8000'

const typeColors = {
  cv:  { bg: 'rgba(124,106,247,0.12)', color: '#a596ff', label: 'CV' },
  jd:  { bg: 'rgba(62,207,142,0.10)',  color: '#3ecf8e', label: 'JD' },
}

export default function DocumentPanel({ onDocumentsChange }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const fetchDocs = async () => {
    try {
      const res = await fetch(`${API}/documents`)
      const data = await res.json()
      setDocs(data.documents || [])
      onDocumentsChange?.(data.documents || [])
    } catch {
      // backend not running yet
    }
  }

  useEffect(() => { fetchDocs() }, [])

  // expose refresh
  DocumentPanel.refresh = fetchDocs

  const handleDelete = async (docId) => {
    if (!confirm(`Remove "${docId}" from the knowledge base?`)) return
    setDeleting(docId)
    try {
      await fetch(`${API}/documents/${encodeURIComponent(docId)}`, { method: 'DELETE' })
      await fetchDocs()
    } finally {
      setDeleting(null)
    }
  }

  const cvDocs = docs.filter(d => d.doc_type === 'cv')
  const jdDocs = docs.filter(d => d.doc_type === 'jd')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%', overflow: 'auto' }}>
      <Section
        title="Resume"
        badge={cvDocs.length}
        badgeColor="#a596ff"
        docs={cvDocs}
        deleting={deleting}
        onDelete={handleDelete}
        empty="No CV uploaded yet."
      />
      <Section
        title="Job descriptions"
        badge={jdDocs.length}
        badgeColor="#3ecf8e"
        docs={jdDocs}
        deleting={deleting}
        onDelete={handleDelete}
        empty="No job descriptions added yet."
      />
    </div>
  )
}

function Section({ title, badge, badgeColor, docs, deleting, onDelete, empty }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5a5a6e' }}>{title}</span>
        {badge > 0 && (
          <span style={{ background: `${badgeColor}22`, color: badgeColor, borderRadius: 20, padding: '1px 8px', fontSize: '0.75rem', fontWeight: 600 }}>{badge}</span>
        )}
      </div>

      {docs.length === 0 ? (
        <p style={{ color: '#5a5a6e', fontSize: '0.85rem', padding: '8px 0' }}>{empty}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {docs.map(doc => (
            <DocRow
              key={doc.doc_id}
              doc={doc}
              deleting={deleting === doc.doc_id}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DocRow({ doc, deleting, onDelete }) {
  const tc = typeColors[doc.doc_type] || typeColors.jd
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#1c1c21', border: '1px solid #2e2e36',
      borderRadius: 8, padding: '8px 12px',
      animation: 'fadeUp 0.25s ease',
    }}>
      <span style={{
        background: tc.bg, color: tc.color,
        borderRadius: 5, padding: '1px 7px',
        fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em',
        flexShrink: 0,
      }}>{tc.label}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#e8e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.company_name || doc.doc_id}
        </div>
        {doc.source_file && (
          <div style={{ fontSize: '0.75rem', color: '#5a5a6e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc.source_file}
          </div>
        )}
      </div>

      <button
        onClick={() => onDelete(doc.doc_id)}
        disabled={deleting}
        title="Remove document"
        style={{
          background: 'none', color: deleting ? '#3a3a44' : '#5a5a6e',
          fontSize: '1rem', padding: '2px 4px', borderRadius: 4,
          transition: 'color 0.15s', flexShrink: 0,
        }}
        onMouseEnter={e => !deleting && (e.target.style.color = '#f26464')}
        onMouseLeave={e => !deleting && (e.target.style.color = '#5a5a6e')}
      >
        {deleting ? '…' : '×'}
      </button>
    </div>
  )
}
