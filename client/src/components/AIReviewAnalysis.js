import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Star, Loader2, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const SentimentBadge = ({ sentiment, score }) => {
  const config = {
    positive: { color: 'bg-green-100 text-green-800 border-green-200', label: '😊 Positive' },
    mixed:    { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: '😐 Mixed' },
    negative: { color: 'bg-red-100 text-red-800 border-red-200', label: '😔 Negative' },
  };
  const c = config[sentiment] || config.mixed;
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${c.color}`}>
      {c.label} · {score}/10
    </span>
  );
};

const AIReviewAnalysis = ({ productId, numReviews }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchAnalysis = async () => {
    if (data) return; // already loaded
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/products/${productId}/ai-analysis`);
      if (!res.ok) throw new Error('Failed to fetch analysis');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError('Could not load AI analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !data && !loading) fetchAnalysis();
  };

  if (numReviews === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="text-purple-600 w-5 h-5" />
          <span className="font-semibold text-purple-800 text-base">AI Review Analysis</span>
          <span className="text-xs text-purple-500 bg-purple-100 px-2 py-0.5 rounded-full">Powered by Gemini</span>
        </div>
        {open ? (
          <ChevronUp className="text-purple-500 w-5 h-5" />
        ) : (
          <ChevronDown className="text-purple-500 w-5 h-5" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-purple-100">
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-purple-600">
              <Loader2 className="animate-spin w-5 h-5" />
              <span className="text-sm">Gemini is analyzing reviews...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 py-4 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {data && (
            <div className="mt-4 space-y-4">
              {/* Sentiment */}
              <div className="flex items-center gap-3">
                <SentimentBadge sentiment={data.sentiment} score={data.sentimentScore} />
              </div>

              {/* Summary */}
              <p className="text-gray-700 text-sm leading-relaxed">{data.summary}</p>

              {/* Pros & Cons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <div className="flex items-center gap-1.5 mb-2 text-green-700 font-semibold text-sm">
                    <ThumbsUp className="w-4 h-4" /> What customers love
                  </div>
                  <ul className="space-y-1">
                    {data.pros?.map((p, i) => (
                      <li key={i} className="text-sm text-green-800 flex items-start gap-1.5">
                        <span className="text-green-500 mt-0.5">✓</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <div className="flex items-center gap-1.5 mb-2 text-red-700 font-semibold text-sm">
                    <ThumbsDown className="w-4 h-4" /> Common complaints
                  </div>
                  <ul className="space-y-1">
                    {data.cons?.map((c, i) => (
                      <li key={i} className="text-sm text-red-800 flex items-start gap-1.5">
                        <span className="text-red-400 mt-0.5">✗</span> {c}
                      </li>
                    ))}
                    {data.cons?.length === 0 && <li className="text-sm text-gray-500">No significant complaints.</li>}
                  </ul>
                </div>
              </div>

              {/* Top Features */}
              {data.topFeatures?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-purple-700 font-semibold text-sm">
                    <Star className="w-4 h-4" /> Most mentioned features
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.topFeatures.map((f, i) => (
                      <span key={i} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestion */}
              {data.suggestion && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
                  <span className="font-semibold">💡 Suggestion: </span>{data.suggestion}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIReviewAnalysis;
