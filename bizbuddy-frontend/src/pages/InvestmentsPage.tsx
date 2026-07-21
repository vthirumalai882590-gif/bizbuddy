import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, TrendingUp, X, Sparkles, MessageSquare, Send, DollarSign, Layers } from 'lucide-react'
import { expenseApi } from '@/services/api'
import type { Expense, ExpenseCategory } from '@/types'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const CATEGORIES: ExpenseCategory[] = [
  'inventory', 'rent', 'electricity', 'salary', 'marketing',
  'transport', 'maintenance', 'tax', 'loan_emi', 'other',
]

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  inventory: 'bg-blue-50 text-blue-700 border-blue-100',
  rent: 'bg-purple-50 text-purple-700 border-purple-100',
  electricity: 'bg-amber-50 text-amber-700 border-amber-100',
  salary: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  marketing: 'bg-pink-50 text-pink-700 border-pink-100',
  transport: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  maintenance: 'bg-orange-50 text-orange-700 border-orange-100',
  tax: 'bg-red-50 text-red-700 border-red-100',
  loan_emi: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  other: 'bg-gray-50 text-gray-700 border-gray-100',
}

const schema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  category: z.enum(CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]]),
  description: z.string().min(1, 'Required'),
  date: z.string().min(1, 'Required'),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'credit']),
  vendor: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function InvestmentsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all')

  const [coachAdvice, setCoachAdvice] = useState<string>('')
  const [loadingCoach, setLoadingCoach] = useState<boolean>(false)
  const [coachError, setCoachError] = useState<boolean>(false)
  const [chatOpen, setChatOpen] = useState<boolean>(false)
  const [chatMessage, setChatMessage] = useState<string>('')
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: 'Namaste! 🙏 I am your investment assistant. I can analyze your outlays and recommend which areas or inventory objects to target to optimize your turnover and returns. Ask me anything!' }
  ])
  const [sendingChat, setSendingChat] = useState<boolean>(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => expenseApi.list().then((r) => r.data.data),
  })

  useEffect(() => {
    if (chatOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatHistory, chatOpen])

  const filtered = filterCategory === 'all' ? expenses : expenses.filter((e: Expense) => e.category === filterCategory)
  const totalInvested = expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0)
  const inventoryExpenses = expenses.filter((e: { category: string }) => e.category === 'inventory').reduce((sum: number, e: Expense) => sum + e.amount, 0)
  const operationalExpenses = totalInvested - inventoryExpenses

  // Find top spending category dynamically
  const categoryTotals: Record<string, number> = {}
  for (const e of expenses as Expense[]) {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount
  }
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])
  const topCategory = sortedCategories[0]?.[0] || 'none'

  // ─── AI Profit & Margin Strategy Guide (real AI call, no local fallback) ──
  // Builds a per-category breakdown so the model can reason about which
  // spending categories are eating the budget, not just total/inventory split.
  const buildExpenseSnapshot = () => {
    const byCategory: Record<string, number> = {}
    for (const e of expenses as Expense[]) {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
    }
    return {
      totalInvested,
      inventoryExpenses,
      operationalExpenses,
      inventoryPercentOfTotal: totalInvested ? Math.round((inventoryExpenses / totalInvested) * 100) : 0,
      byCategory,
      recentEntries: (expenses as Expense[])
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15)
        .map(e => ({ description: e.description, category: e.category, amount: e.amount, vendor: e.vendor || null, date: e.date })),
    }
  }

  const fetchCoachData = async () => {
    if (expenses.length === 0) {
      setCoachAdvice('Add business investments above to get AI-powered margin and pricing advice.')
      setCoachError(false)
      return
    }

    setLoadingCoach(true)
    setCoachError(false)

    try {
      const res = await expenseApi.getAiCoach()
      const advice = res.data?.advice
      if (!res.data?.success || !advice) throw new Error('AI coach returned no advice')
      setCoachAdvice(advice)
    } catch (err) {
      console.error('AI Coach call failed:', err)
      setCoachError(true)
      setCoachAdvice('Could not reach the AI Coach right now. Tap to retry.')
    } finally {
      setLoadingCoach(false)
    }
  }

  useEffect(() => {
    fetchCoachData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses])

  // ─── AI Investment Chat — real call with full conversation memory ─────────
  const handleSendChat = async (text: string = chatMessage) => {
    const trimmed = text.trim()
    if (!trimmed || sendingChat) return

    const updatedHistory = [...chatHistory, { role: 'user' as const, content: trimmed }]
    setChatHistory(updatedHistory)
    setChatMessage('')
    setSendingChat(true)

    const snapshot = buildExpenseSnapshot()
    const detailedContext = `Current investment/expense snapshot (JSON, always treat as the live, accurate source of truth — ignore older numbers mentioned earlier in the conversation):
${JSON.stringify(snapshot)}

You are the AI Investment Coach inside BizBuddy AI, advising a small Indian shop owner. Analyze which categories or items give the best returns, flag overspending categories, and recommend specific, concrete next actions (which items/categories to invest more in, which to cut, restock or negotiation moves) to boost profit. Use ₹ for money. Keep answers concise (2-4 sentences) unless asked for more detail.`

    try {
      // Send full conversation history (minus the seed greeting) so the
      // backend/model has memory across turns, alongside the fresh context.
      const historyForApi = updatedHistory.slice(1) // drop static intro greeting
      const res = await expenseApi.chat(trimmed, detailedContext, historyForApi)
      const reply = res.data?.reply
      if (!reply) throw new Error('Empty AI response')
      setChatHistory(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      console.error('AI chat call failed:', err)
      setChatHistory(prev => [...prev, { role: 'assistant', content: "I couldn't reach the AI service just now — please check your connection and try again." }])
    } finally {
      setSendingChat(false)
    }
  }

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), paymentMethod: 'cash', category: 'inventory' },
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => expenseApi.create(data),
    onSuccess: () => {
      toast.success('Investment entry added successfully')
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['dashboard-overview'] })
      qc.invalidateQueries({ queryKey: ['dashboard-activity'] })
      setShowForm(false)
      reset()
    },
    onError: () => toast.error('Failed to add investment'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseApi.delete(id),
    onSuccess: () => {
      toast.success('Investment entry removed')
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['dashboard-overview'] })
      qc.invalidateQueries({ queryKey: ['dashboard-activity'] })
    },
    onError: () => toast.error('Failed to remove investment'),
  })

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-white border border-gray-100 rounded-3xl shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Business Investments</h1>
          <p className="text-xs text-gray-400 mt-1">Track and audit raw materials, stock, and fixed operating assets</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer self-start sm:self-auto shadow-md">
          <Plus size={15} /> Add Investment
        </button>
      </div>

      {/* Metrics Cards Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 border border-gray-100 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Layers size={20} /></div>
          <div>
            <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Total Investment Outflow</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">₹{totalInvested.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="bg-white p-5 border border-gray-100 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><TrendingUp size={20} /></div>
          <div>
            <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Inventory Allocation</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">₹{inventoryExpenses.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="bg-white p-5 border border-gray-100 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><DollarSign size={20} /></div>
          <div>
            <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Operational Cost Overhead</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">₹{operationalExpenses.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filter Outlays</span>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterCategory('all')} className={clsx('px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border', filterCategory === 'all' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-gray-150 text-gray-500 hover:bg-gray-50')}>
            All Categories
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setFilterCategory(c)} className={clsx('px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer border', filterCategory === c ? 'bg-slate-900 border-slate-900 text-white' : CATEGORY_COLORS[c])}>
              {c.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Database View Grid */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">Date &amp; Details</th>
                <th className="text-left px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">Category</th>
                <th className="text-left px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">Payment Mode</th>
                <th className="text-right px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                <th className="text-center px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-400 font-medium bg-white">
                    No investment entries found. Click "Add Investment" to get started!
                  </td>
                </tr>
              ) : (
                filtered.map((e: Expense) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-700">{e.description}</span>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400 font-medium">
                          <span>{format(new Date(e.date), 'dd MMM yyyy')}</span>
                          {e.vendor && (
                            <>
                              <span>•</span>
                              <span>Supplier: {e.vendor}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={clsx('px-2.5 py-1 rounded-lg text-[9px] font-extrabold capitalize border', CATEGORY_COLORS[e.category])}>
                        {e.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 uppercase text-[10px] font-bold">{e.paymentMethod.replace('_', ' ')}</td>
                    <td className="px-5 py-4 text-right font-extrabold text-slate-800">₹{e.amount.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => {
                        if (window.confirm('Are you sure you want to delete this investment outlay record?')) {
                          deleteMutation.mutate(e.id)
                        }
                      }} disabled={deleteMutation.isPending} className="text-gray-300 hover:text-red-500 transition p-1.5 hover:bg-red-50 rounded-xl cursor-pointer disabled:opacity-30 inline-block">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>


      </div>

      {/* Dynamic AI Insights System Bar */}
      <div className={clsx(
        "border rounded-3xl p-6 shadow-xs relative overflow-hidden",
        coachError ? "bg-rose-50 border-rose-100" : "bg-gradient-to-r from-violet-50 to-indigo-50 border-violet-100"
      )}>
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
          <Sparkles size={160} className={coachError ? "text-rose-900" : "text-violet-900"} />
        </div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className={clsx(coachError ? "text-rose-600" : "text-violet-600 animate-pulse")} size={18} />
            <h3 className={clsx("font-black text-sm tracking-tight", coachError ? "text-rose-900" : "text-violet-900")}>AI Profit &amp; Margin Strategy Guide</h3>
          </div>
          {coachError && (
            <button
              onClick={fetchCoachData}
              disabled={loadingCoach}
              className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded-lg font-bold disabled:opacity-50 transition cursor-pointer"
            >
              {loadingCoach ? 'Retrying...' : 'Retry'}
            </button>
          )}
        </div>
        <p className={clsx("text-xs whitespace-pre-line leading-relaxed font-medium", coachError ? "text-rose-800" : "text-violet-800")}>
          {loadingCoach ? 'Analyzing your investments with AI...' : coachAdvice}
        </p>
      </div>

      {/* Floating Chat Workspace Engine */}
      <div className="fixed bottom-6 right-6 z-50">
        {!chatOpen ? (
          <button onClick={() => setChatOpen(true)} className="bg-violet-600 text-white rounded-2xl px-5 py-3.5 shadow-xl hover:bg-violet-700 transition flex items-center gap-2 text-xs font-bold cursor-pointer hover:-translate-y-0.5 transform duration-200">
            <MessageSquare size={16} /> Consult Profit Coach
          </button>
        ) : (
          <div className="bg-white rounded-3xl w-80 sm:w-96 h-[450px] shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-700 text-white px-5 py-4 flex justify-between items-center shadow-md">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-violet-200 animate-pulse" />
                <span className="font-black text-xs tracking-tight">BizBuddy AI Investment Coach</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-violet-100 hover:text-white transition cursor-pointer p-1 rounded-lg hover:bg-white/10"><X size={16} /></button>
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
              {chatHistory.map((chat, idx) => (
                <div key={idx} className={clsx("max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs", chat.role === 'user' ? "bg-violet-600 text-white ml-auto rounded-tr-sm" : "bg-white text-gray-800 border border-gray-100 rounded-tl-sm")}>
                  <p className="whitespace-pre-wrap">{chat.content}</p>
                </div>
              ))}
              {sendingChat && (
                <div className="text-[10px] text-gray-400 animate-pulse px-2 flex items-center gap-1 font-bold">
                  <Sparkles size={11} className="animate-spin text-violet-500" />
                  AI Coach is analyzing your investments...
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Prompts inside Chatbot */}
            {chatHistory.length === 1 && (
              <div className="px-4 py-2 flex flex-wrap gap-1.5 bg-slate-50 border-t border-gray-50">
                {topCategory === 'inventory' && (
                  <>
                    <button onClick={() => handleSendChat('How to negotiate bulk discounts with suppliers?')} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg hover:border-violet-500 hover:text-violet-600 transition cursor-pointer font-medium shadow-2xs">Negotiate supplier costs</button>
                    <button onClick={() => handleSendChat('How to cut inventory storage costs?')} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg hover:border-violet-500 hover:text-violet-600 transition cursor-pointer font-medium shadow-2xs">Reduce stock overhead</button>
                  </>
                )}
                {topCategory === 'rent' && (
                  <>
                    <button onClick={() => handleSendChat('Tips for retail space rent negotiation?')} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg hover:border-violet-500 hover:text-violet-600 transition cursor-pointer font-medium shadow-2xs">Negotiate retail rent</button>
                    <button onClick={() => handleSendChat('How to optimize our storefront layout to increase return per sqft?')} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg hover:border-violet-500 hover:text-violet-600 transition cursor-pointer font-medium shadow-2xs">Layout/ROI optimization</button>
                  </>
                )}
                {topCategory === 'salary' && (
                  <button onClick={() => handleSendChat('When should we use commission-based staff instead of fixed salaries?')} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg hover:border-violet-500 hover:text-violet-600 transition cursor-pointer font-medium shadow-2xs">Payroll optimization</button>
                )}
                {topCategory !== 'inventory' && topCategory !== 'rent' && topCategory !== 'salary' && topCategory !== 'none' && (
                  <button onClick={() => handleSendChat(`How can I reduce our ${topCategory.replace('_', ' ')} costs?`)} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg hover:border-violet-500 hover:text-violet-600 transition cursor-pointer font-medium shadow-2xs">Reduce {topCategory.replace('_', ' ')}</button>
                )}
                <button onClick={() => handleSendChat('Analyze my current investments and sales health')} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg hover:border-violet-500 hover:text-violet-600 transition cursor-pointer font-medium shadow-2xs">Analyze investment health</button>
              </div>
            )}

            <div className="p-3 border-t border-gray-50 flex gap-2 bg-white">
              <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} placeholder="Ask which assets drive higher markup yield..." disabled={sendingChat} className="flex-1 border border-gray-200 bg-gray-50 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-violet-500 focus:bg-white transition disabled:opacity-60" />
              <button onClick={() => handleSendChat()} disabled={!chatMessage.trim() || sendingChat} className="bg-violet-600 hover:bg-violet-700 text-white p-2.5 rounded-xl transition cursor-pointer disabled:opacity-30"><Send size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Form Overlay */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
              <h2 className="font-black text-slate-800 text-base tracking-tight">Record New Outlay</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 transition cursor-pointer"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Amount (₹)</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                  <input type="number" step="0.01" {...register('amount')} className="w-full text-xs pl-7 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white transition" placeholder="e.g. 5000" />
                </div>
                {errors.amount && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.amount.message}</p>}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Item Description</label>
                <input {...register('description')} className="w-full mt-1 text-xs px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white transition" placeholder="e.g. Wheat flour bulk restock" />
                {errors.description && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Category</label>
                  <select {...register('category')} className="w-full mt-1 text-xs px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white transition">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Payment Mode</label>
                  <select {...register('paymentMethod')} className="w-full mt-1 text-xs px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white transition">
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit">Credit / Udhaar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Date</label>
                  <div className="relative mt-1">
                    <input type="date" {...register('date')} className="w-full text-xs px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white transition" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Supplier Name</label>
                  <input {...register('vendor')} className="w-full mt-1 text-xs px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white transition" placeholder="Optional" />
                </div>
              </div>

              <button type="submit" disabled={createMutation.isPending} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-bold transition mt-2 cursor-pointer shadow-md flex items-center justify-center gap-2">
                {createMutation.isPending ? 'Saving Record...' : 'Save Asset Record'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}