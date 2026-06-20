import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Send, Bot, User, TrendingUp, DollarSign, Layers, TrendingDown, Trash2 } from 'lucide-react'
import { aiApi } from '@/services/api'
import { useBusinessData } from '@/hooks/useBusinessData'
import type { ChatMessage } from '@/types'
import { clsx } from 'clsx'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const QUICK_PROMPTS = {
  financial: [
    'Analyze my investments vs current returns and outline losses.',
    'What is my absolute return on investment (ROI) metric right now?',
    'Give me a definitive strategic recovery plan to optimize net profit margins.',
  ]
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={clsx('flex gap-3', isUser && 'flex-row-reverse')}>
      <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0', isUser ? 'bg-slate-900' : 'bg-purple-100')}>
        {isUser ? <User size={15} className="text-white" /> : <Bot size={15} className="text-purple-700" />}
      </div>
      <div className={clsx('max-w-[80%] rounded-2xl px-4 py-3 text-sm', isUser ? 'bg-slate-900 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-xs')}>
        <div className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
        <p className={clsx('text-xs mt-1', isUser ? 'text-slate-400' : 'text-gray-400')}>{format(msg.timestamp, 'hh:mm a')}</p>
      </div>
    </div>
  )
}

export default function AIAdvisorPage() {
  const { metrics } = useBusinessData()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Direct calculation variables linked to dynamic context properties
  const totalInvestment = metrics?.stockInvestments || 0
  const totalSales = metrics?.totalSalesInflow || 0
  const netProfitOrLoss = totalSales - totalInvestment
  const isLossSituation = netProfitOrLoss < 0

  // Read message history layout
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('bizbuddy_chat_history')
    if (!saved) return []
    try {
      return (JSON.parse(saved) as ChatMessage[]).map(m => ({ ...m, timestamp: new Date(m.timestamp) }))
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('bizbuddy_chat_history', JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const chatMutation = useMutation({
    mutationFn: (msgs: { role: string; content: string }[]) => {
      const runtimeGroundingContext = `
        [REAL-TIME BUSINESS GROUNDING MATRIX]
        You are looking directly at the user's verified financial system dashboard parameters:
        
        CURRENT HARD LEDGER LOGS:
        - Total Stock Investment: ₹${totalInvestment}
        - Total Sales Inflow: ₹${totalSales}
        - Net Performance Margin: ₹${netProfitOrLoss}
        - Operational Situation: RUNNING IN DEFICIT OF ₹${Math.abs(netProfitOrLoss)}
        
        CRITICAL RESPONSE MANDATE:
        1. You MUST reference these exact values (₹${totalInvestment.toLocaleString('en-IN')} and ₹${totalSales.toLocaleString('en-IN')}) in your response. 
        2. Do NOT use placeholder values or say the investment is ₹0. Analyze the real loss gap explicitly.
      `
      return aiApi.chat([{ role: 'system', content: runtimeGroundingContext }, ...msgs]).then(r => r.data.data)
    },
    onSuccess: (data: { content: string }) => {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.content, timestamp: new Date() }])
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to send message')
    }
  })

  const handleSend = (text: string) => {
    if (!text.trim() || chatMutation.isPending) return
    const updated: ChatMessage[] = [...messages, { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() }]
    setMessages(updated)
    setInput('')
    chatMutation.mutate(updated.map(m => ({ role: m.role, content: m.content })))
  }

  const handleClearHistory = () => {
    localStorage.removeItem('bizbuddy_chat_history')
    setMessages([])
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4">
      
      {/* Financial Performance Header Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3 border border-gray-100 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Layers size={16} /></div>
          <div>
            <p className="text-[10px] uppercase text-gray-400 font-bold">Total Stock Investment</p>
            <p className="text-sm font-black text-slate-800">₹{totalInvestment.toLocaleString('en-IN')}</p>
          </div>
        </div>
        
        <div className="bg-white p-3 border border-gray-100 rounded-xl flex items-center gap-3 shadow-xs">
          <div className={clsx('p-2 rounded-lg', isLossSituation ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600')}>
            {isLossSituation ? <TrendingDown size={16} /> : <DollarSign size={16} />}
          </div>
          <div>
            <p className="text-[10px] uppercase text-gray-400 font-bold">{isLossSituation ? 'Net Deficit Status' : 'Net Sync Profit'}</p>
            <p className={clsx('text-sm font-black', isLossSituation ? 'text-rose-600' : 'text-emerald-600')}>
              ₹{Math.abs(netProfitOrLoss).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="bg-white p-3 border border-gray-100 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><TrendingUp size={16} /></div>
          <div>
            <p className="text-[10px] uppercase text-gray-400 font-bold">Total Sales Inflow</p>
            <p className="text-sm font-black text-slate-800">₹{totalSales.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Main Layout Chat Workspace Container */}
      <div className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col min-h-0 shadow-xs">
        
        {/* Dedicated Workspace Action Header Control Bar */}
        <div className="bg-white px-4 py-2.5 border-b border-gray-100 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {/* ✅ Changed Header Title string layout from Copilot to BizBuddy */}
            <span className="text-xs font-bold text-slate-700">BizBuddy Business Intelligence Agent</span>
          </div>
          <button
            type="button"
            onClick={handleClearHistory}
            className="text-xs text-rose-600 hover:text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={13} />
            Clear Conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Static Core Welcome System Message Bubble */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-purple-100">
              <Bot size={15} className="text-purple-700" />
            </div>
            <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-xs">
              <div className="whitespace-pre-wrap leading-relaxed">
                Namaste! 🙏 I have synchronized your dashboard records.<br /><br />
                I can see a structural investment layout of <strong>₹{totalInvestment.toLocaleString('en-IN')}</strong> against inflows of <strong>₹{totalSales.toLocaleString('en-IN')}</strong>. Ask me anything about mitigating your present margin gaps!
              </div>
              <p className="text-xs mt-1 text-gray-400">Live Synchronized System Feed</p>
            </div>
          </div>

          {/* Historical chat thread array rendering */}
          {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
          {chatMutation.isPending && <div className="text-xs text-gray-400 animate-pulse px-2">BizBuddy calculations running forecasts...</div>}
          <div ref={bottomRef} />
        </div>

        {messages.length === 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {QUICK_PROMPTS.financial.map(p => (
              <button key={p} onClick={() => handleSend(p)} className="text-xs bg-white text-slate-700 px-3 py-1.5 border border-gray-200 rounded-full hover:border-purple-500 hover:text-purple-600 transition cursor-pointer shadow-xs">{p}</button>
            ))}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSend(input) }} className="p-3 bg-white border-t border-gray-100 rounded-b-2xl flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask how to recover from the deficit or manage stock velocity..." className="flex-1 text-xs px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition" />
          <button type="submit" disabled={!input.trim() || chatMutation.isPending} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1 transition"><Send size={12} /></button>
        </form>
      </div>
    </div>
  )
}