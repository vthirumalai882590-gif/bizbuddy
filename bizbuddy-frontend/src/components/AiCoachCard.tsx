import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'

interface AiCoachCardProps {
  title?: string
  /** Should resolve to an axios-style response: r.data.advice */
  fetchAdvice: () => Promise<{ data: { success: boolean; advice?: string; error?: string } }>
}

/**
 * Renders bullet-point advice text from the Gemini coach endpoints.
 * The backend returns plain text bullets (lines starting with - or *),
 * so we split on newlines rather than expecting markdown/HTML.
 */
function AdviceList({ advice }: { advice: string }) {
  const lines = advice
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  return (
    <ul className="space-y-2.5">
      {lines.map((line, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
          <span>{line.replace(/^[-*•]\s*/, '')}</span>
        </li>
      ))}
    </ul>
  )
}

export default function AiCoachCard({ title = 'Ask AI Coach', fetchAdvice }: AiCoachCardProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [advice, setAdvice] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleFetch = async () => {
    setStatus('loading')
    setError('')
    try {
      const res = await fetchAdvice()
      if (res.data.success && res.data.advice) {
        setAdvice(res.data.advice)
        setStatus('success')
      } else {
        setError(res.data.error || 'Could not get advice right now.')
        setStatus('error')
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not reach the AI coach. Try again in a moment.')
      setStatus('error')
    }
  }

  return (
    <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-xs">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Sparkles size={15} className="text-purple-600" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
        </div>
        {status === 'success' && (
          <button
            onClick={handleFetch}
            className="text-xs font-semibold text-gray-400 hover:text-purple-600 flex items-center gap-1 transition-colors"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        )}
      </div>

      {status === 'idle' && (
        <div className="py-4">
          <p className="text-xs text-gray-500 mb-3">
            Get a quick, plain-language read on these numbers from your AI business coach.
          </p>
          <button
            onClick={handleFetch}
            className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg px-3.5 py-2 flex items-center gap-1.5"
          >
            <Sparkles size={13} />
            Get advice
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div className="py-6 flex items-center justify-center gap-2 text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-xs font-semibold">Thinking it through...</span>
        </div>
      )}

      {status === 'error' && (
        <div className={clsx('flex items-start gap-2.5 p-3 rounded-lg border text-xs leading-relaxed mt-2',
          'text-red-600 bg-red-50 border-red-100')}>
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{error}</p>
            <button onClick={handleFetch} className="font-bold underline mt-1.5">Try again</button>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="mt-2">
          <AdviceList advice={advice} />
        </div>
      )}
    </div>
  )
}