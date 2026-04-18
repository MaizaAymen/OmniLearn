import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircleOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  RightOutlined,
  SearchOutlined,
  EditOutlined,
} from '@ant-design/icons';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/uml`;

function formatDate(value) {
  if (!value) return 'Unknown date';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const TOPIC_SUGGESTIONS = [
  'E-commerce System',
  'Hospital Management',
  'Banking System',
  'Library System',
  'School Management',
  'Restaurant Ordering',
];

const ACCENT_COLORS = [
  '#3A10E5', // codecademy purple
  '#008A27', // green
  '#F59E0B', // amber
  '#E91C11', // red
  '#6366F1', // indigo
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#F97316', // orange
];

export default function Problem() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
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

      setTopic('');
      await loadProblems();
    } catch (e2) {
      setError(e2.message || 'Failed to generate UML problem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF0E5' }}>
      {/* Hero Banner */}
      <div className="border-b-2" style={{ borderColor: '#10162F' }}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h1
            className="font-bold leading-tight mb-3"
            style={{ fontSize: '3rem', color: '#10162F', letterSpacing: '-0.02em' }}
          >
            UML Problems
          </h1>
          <p className="text-lg max-w-xl" style={{ color: '#3D4168', lineHeight: 1.6 }}>
            Practice designing class diagrams with AI-generated challenges.
            Pick a topic and sharpen your object-oriented design skills.
          </p>
          <button
            type="button"
            onClick={() => navigate('/uml')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200"
            style={{ backgroundColor: '#3A10E5', color: '#FFFFFF' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2D0CB8')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3A10E5')}
          >
            <EditOutlined />
            Free Draw
          </button>
        </div>
      </div>

      {/* Generate Section */}
      <div className="border-b-2" style={{ borderColor: '#10162F', backgroundColor: '#FFF7F0' }}>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h2
            className="font-bold text-base mb-4"
            style={{ color: '#10162F', letterSpacing: '-0.01em' }}
          >
            Generate a new problem
          </h2>

          {/* Topic chips */}
          <div className="flex flex-wrap gap-2.5 mb-5">
            {TOPIC_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTopic(s)}
                className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200"
                style={
                  topic === s
                    ? { backgroundColor: '#3A10E5', color: '#FFFFFF' }
                    : {
                        backgroundColor: '#FFFFFF',
                        color: '#10162F',
                        border: '2px solid #10162F',
                      }
                }
                onMouseEnter={(e) => {
                  if (topic !== s) {
                    e.currentTarget.style.backgroundColor = '#10162F';
                    e.currentTarget.style.color = '#FFFFFF';
                  }
                }}
                onMouseLeave={(e) => {
                  if (topic !== s) {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.color = '#10162F';
                  }
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input row */}
          <form onSubmit={generateProblem} className="flex gap-3 max-w-2xl">
            <div className="flex-1 relative">
              <SearchOutlined
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: '#3D4168' }}
              />
              <input
                type="text"
                placeholder="Or type a custom topic..."
                value={topic}
                onChange={(ev) => setTopic(ev.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{
                  border: '2px solid #10162F',
                  backgroundColor: '#FFFFFF',
                  color: '#10162F',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3A10E5')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#10162F')}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all duration-200"
              style={{
                backgroundColor: loading ? '#6B5CE7' : '#3A10E5',
                color: '#FFFFFF',
                opacity: loading ? 0.8 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#2D0CB8';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#3A10E5';
              }}
            >
              {loading ? (
                <span
                  className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                />
              ) : (
                <PlusCircleOutlined />
              )}
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          {/* Error */}
          {error && (
            <div
              className="flex items-center justify-between rounded-lg px-5 py-3 mb-8 text-sm font-medium"
              style={{ backgroundColor: '#FEE2E2', color: '#E91C11', border: '2px solid #E91C11' }}
            >
              <span>{error}</span>
              <button
                className="font-bold hover:underline ml-4"
                onClick={() => setError('')}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Section Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2
                className="font-bold text-2xl"
                style={{ color: '#10162F', letterSpacing: '-0.01em' }}
              >
                Your Problems
              </h2>
              {hasProblems && (
                <p className="text-sm mt-1" style={{ color: '#3D4168' }}>
                  {problems.length} {problems.length === 1 ? 'challenge' : 'challenges'} available
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={loadProblems}
              disabled={listLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
              style={{
                border: '2px solid #10162F',
                color: '#10162F',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#10162F';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#10162F';
              }}
            >
              <ReloadOutlined className={listLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Loading Skeletons */}
          {listLoading && !hasProblems && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden"
                  style={{ border: '2px solid #E5E5E5' }}
                >
                  <div className="h-2 bg-gray-200 animate-pulse" />
                  <div className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4 animate-pulse" />
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-3 animate-pulse" />
                    <div className="h-4 bg-gray-100 rounded w-full mb-2 animate-pulse" />
                    <div className="h-4 bg-gray-100 rounded w-2/3 mb-6 animate-pulse" />
                    <div className="h-3 bg-gray-100 rounded w-1/4 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!hasProblems && !listLoading && (
            <div
              className="text-center py-20 rounded-lg"
              style={{ border: '2px dashed #D1D5DB' }}
            >
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-5"
                style={{ backgroundColor: '#FFF0E5' }}
              >
                <PlusCircleOutlined
                  className="text-2xl"
                  style={{ color: '#3A10E5' }}
                />
              </div>
              <p className="font-bold text-lg mb-1" style={{ color: '#10162F' }}>
                No problems yet
              </p>
              <p className="text-sm" style={{ color: '#3D4168' }}>
                Generate your first challenge using the form above.
              </p>
            </div>
          )}

          {/* Problems Grid */}
          {hasProblems && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {problems.map((p, index) => {
                const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/uml/problems/${p.id}`)}
                    className="group rounded-lg overflow-hidden text-left flex flex-col transition-all duration-300"
                    style={{
                      border: '2px solid #10162F',
                      backgroundColor: '#FFFFFF',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '4px 4px 0px #10162F';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Accent bar */}
                    <div className="h-2 w-full" style={{ backgroundColor: accent }} />

                    <div className="p-6 flex flex-col flex-1">
                      {/* Topic badge */}
                      <span
                        className="text-xs font-bold uppercase tracking-wider self-start px-2.5 py-1 rounded mb-4"
                        style={{
                          color: accent,
                          backgroundColor: `${accent}12`,
                          border: `1.5px solid ${accent}40`,
                        }}
                      >
                        {p.topic || 'General'}
                      </span>

                      {/* Title */}
                      <h3
                        className="font-bold leading-snug mb-3 line-clamp-2 group-hover:underline"
                        style={{ fontSize: '1.05rem', color: '#10162F' }}
                      >
                        {p.title || 'Untitled UML Problem'}
                      </h3>

                      {/* Description */}
                      <p
                        className="text-sm line-clamp-3 leading-relaxed flex-1"
                        style={{ color: '#3D4168' }}
                      >
                        {p.problemDescription}
                      </p>

                      {/* Footer */}
                      <div
                        className="flex items-center justify-between mt-5 pt-4"
                        style={{ borderTop: '1px solid #E5E7EB' }}
                      >
                        <span
                          className="flex items-center gap-1.5 text-xs"
                          style={{ color: '#9CA3AF' }}
                        >
                          <ClockCircleOutlined />
                          {formatDate(p.createdAt)}
                        </span>
                        <span
                          className="flex items-center gap-1.5 text-xs font-bold transition-colors"
                          style={{ color: '#3A10E5' }}
                        >
                          Start
                          <RightOutlined className="text-[10px] group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
