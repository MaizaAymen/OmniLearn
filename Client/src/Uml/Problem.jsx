import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/uml`;

function formatDate(value) {
  if (!value) return 'Unknown date';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleString();
}

export default function Problem() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('Ecommerce system');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState('');
  const [problems, setProblems] = useState([]);

  const hasProblems = useMemo(() => problems.length > 0, [problems.length]);

  const loadProblems = async () => {
    setListLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/problems`);
      if (!response.ok) {
        throw new Error('Could not load UML problems');
      }
      const data = await response.json();
      setProblems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Could not load UML problems');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadProblems();
  }, []);

  const generateProblem = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Please enter a topic first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/generate-uml`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate UML problem');
      }

      await loadProblems();
    } catch (e2) {
      setError(e2.message || 'Failed to generate UML problem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 12 }}>
      <h2 style={{ marginTop: 0, marginBottom: 8, color: '#0F172A' }}>UML Problems</h2>
      <p style={{ marginTop: 0, marginBottom: 18, color: '#475569' }}>
        Generate UML class diagram problems, review all generated problems, and open any one in the editor.
      </p>

      <form
        onSubmit={generateProblem}
        style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <input
          type='text'
          placeholder='Enter a topic (School, Hospital, Banking...)'
          value={topic}
          onChange={(ev) => setTopic(ev.target.value)}
          style={{
            flex: '1 1 320px',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 14,
          }}
        />
        <button
          type='submit'
          disabled={loading}
          style={{
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontWeight: 700,
            background: loading ? '#94A3B8' : '#2563EB',
            color: '#FFFFFF',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Generating...' : 'Generate UML Problem'}
        </button>
      </form>

      {error ? (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #FECACA',
            background: '#FEF2F2',
            color: '#B91C1C',
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0, color: '#0F172A' }}>All UML Problems</h3>
        <button
          type='button'
          onClick={loadProblems}
          disabled={listLoading}
          style={{
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 13,
            cursor: listLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {listLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {!hasProblems && !listLoading ? (
        <div style={{ color: '#64748B', padding: '14px 4px' }}>No UML problems yet. Generate your first one above.</div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {problems.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/uml/problems/${p.id}`)}
            style={{
              textAlign: 'left',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              background: '#FFFFFF',
              padding: 12,
              cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6, color: '#0F172A' }}>{p.title || 'Untitled UML Problem'}</div>
            <div style={{ color: '#475569', fontSize: 13, marginBottom: 6 }}>Topic: {p.topic || 'General'}</div>
            <div
              style={{
                color: '#334155',
                fontSize: 13,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: 54,
              }}
            >
              {p.problemDescription}
            </div>
            <div style={{ marginTop: 8, color: '#94A3B8', fontSize: 12 }}>{formatDate(p.createdAt)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}