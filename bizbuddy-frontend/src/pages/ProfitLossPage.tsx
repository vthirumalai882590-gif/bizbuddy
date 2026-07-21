import { useState, useRef, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowUpRight, ArrowDownRight, DollarSign, Activity, X, Sparkles, MessageSquare, Send, TrendingUp, TrendingDown, Plus, Trash2 } from 'lucide-react'
import { expenseApi, incomeApi, aiApi } from '@/services/api'
import type { Expense, Income, IncomeSource } from '@/types'
import { clsx } from 'clsx'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const SOURCES: IncomeSource[] = ['sales', 'service', 'rent', 'commission', 'online', 'other']

const salesSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  source: z.enum(SOURCES as [IncomeSource, ...IncomeSource[]]),
  description: z.string().min(1, 'Required'),
  date: z.string().min(1, 'Required'),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'bank_transfer']),
  customer: z.string().optional(),
})
type SalesFormData = z.infer<typeof salesSchema>

export default function ProfitLossPage() {
  const qc = useQueryClient()
  const [chatOpen, setChatOpen] = useState<boolean>(false)
  const [chatMessage, setChatMessage] = useState<string>('')
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: 'Namaste! 🙏 I am your Profit & Loss advisor. I can analyze your sales revenue and outlays to give you specific ideas on how to reduce expenses, cut losses, and increase your profit margins. Ask me anything!' }
  ])
  const [sendingChat, setSendingChat] = useState<boolean>(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  const [showSalesForm, setShowSalesForm] = useState(false)

  const [coachAdvice, setCoachAdvice] = useState<string>('')
  const [loadingCoach, setLoadingCoach] = useState<boolean>(false)
  const [coachError, setCoachError] = useState<boolean>(false)

  // Pulls live investment/expense dataset
  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: () => expenseApi.list().then((r) => r.data.data),
  })

  // Pulls live income/sales dataset
  const { data: income = [] } = useQuery<Income[]>({
    queryKey: ['income'],
    queryFn: () => incomeApi.list().then((r) => r.data.data),
  })

  useEffect(() => {
    if (chatOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatHistory, chatOpen])

  const fetchCoachData = async () => {
    if (expenses.length === 0 && income.length === 0) {
      setCoachAdvice('Add sales inflows and investment outlays above to get AI-powered margin and P&L advice.')
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
      setCoachAdvice('Could not reach the AI Coach right now. Tap retry below to attempt again.')
    } finally {
      setLoadingCoach(false)
    }
  }

  useEffect(() => {
    fetchCoachData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, income])

  // Dynamic calculations compiled live from inputs
  const totalExpenses = useMemo(() => expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0), [expenses])
  const totalIncome = useMemo(() => income.reduce((sum: number, i: Income) => sum + i.amount, 0), [income])
  
  const netProfit = totalIncome - totalExpenses
  const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0
  const expenseRatio = totalIncome > 0 ? Math.min(100, Math.max(0, Math.round((totalExpenses / totalIncome) * 100))) : 0

  const handleSendChat = async (text: string = chatMessage) => {
    const trimmed = text.trim()
    if (!trimmed || sendingChat) return

    setChatHistory(prev => [...prev, { role: 'user', content: trimmed }])
    setChatMessage('')
    setSendingChat(true)

    // Prime the assistant with dynamic P&L values to ground response
    const primingInstructions = `
      [P&L SYSTEM STATEMENT GROUNDING]
      The merchant is looking at their live Profit & Loss metrics:
      - Total Revenue Inflow: ₹${totalIncome}
      - Total Outflow Expenses: ₹${totalExpenses}
      - Net Profit Buffer: ₹${netProfit}
      - Operational Margin: ${profitMargin}%
      - Expense-to-Revenue Ratio: ${expenseRatio}%
 
      Your role is to analyze this performance and advise the merchant on how to:
      1. Reduce losses and operating outlays (e.g. lowering fixed costs or inventory wastage).
      2. Increase net profits and margins (e.g. optimizing selling markup, introducing faster velocity stock).
      
      Respond directly to the merchant's query in 2-3 sentences. Keep it extremely actionable and easy to understand.
    `

    const rawHistory = chatHistory.filter(c => c.content !== 'Namaste! 🙏 I am your Profit & Loss advisor...').map(c => ({
      role: c.role === 'assistant' ? 'assistant' : 'user',
      content: c.content
    }))

    const msgs = [
      { role: 'user', content: primingInstructions },
      { role: 'assistant', content: 'Understood. I am now analyzing your Profit & Loss dataset. Let me help you optimize your business margins.' },
      ...rawHistory,
      { role: 'user', content: trimmed }
    ]

    try {
      const res = await aiApi.chat(msgs)
      setChatHistory(prev => [...prev, { role: 'assistant', content: res.data?.data?.content || "Unable to calculate margins strategy right now." }])
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Fallback advice: To reduce losses, try auditing your inventory category expenses. Shifting 10% of marketing outlays to inventory optimization could yield higher counter sales turnover." }])
    } finally {
      setSendingChat(false)
    }
  }

  // Form setups
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SalesFormData>({
    resolver: zodResolver(salesSchema),
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), paymentMethod: 'upi', source: 'sales' },
  })

  // Mutations
  const createSalesMutation = useMutation({
    mutationFn: (data: SalesFormData) => incomeApi.create(data),
    onSuccess: () => {
      toast.success('Sales entry logged successfully!')
      qc.invalidateQueries({ queryKey: ['income'] })
      qc.invalidateQueries({ queryKey: ['dashboard-overview'] })
      qc.invalidateQueries({ queryKey: ['dashboard-activity'] })
      setShowSalesForm(false)
      reset()
    },
    onError: () => toast.error('Failed to log sales entry'),
  })

  const deleteSalesMutation = useMutation({
    mutationFn: (id: string) => incomeApi.delete(id),
    onSuccess: () => {
      toast.success('Sales entry removed')
      qc.invalidateQueries({ queryKey: ['income'] })
      qc.invalidateQueries({ queryKey: ['dashboard-overview'] })
      qc.invalidateQueries({ queryKey: ['dashboard-activity'] })
    },
    onError: () => toast.error('Failed to remove sales entry'),
  })

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => expenseApi.delete(id),
    onSuccess: () => {
      toast.success('Investment entry removed')
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['dashboard-overview'] })
      qc.invalidateQueries({ queryKey: ['dashboard-activity'] })
    },
    onError: () => toast.error('Failed to remove investment entry'),
  })

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-white border border-gray-100 rounded-3xl shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Profit &amp; Loss Statement</h1>
          <p className="text-xs text-gray-400 mt-1">Live operational performance margins and budget audits compiled from system ledgers</p>
        </div>
        <button onClick={() => setShowSalesForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer self-start sm:self-auto shadow-md">
          <Plus size={15} /> Log Sales Inflow
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Total Sales Inflows</span>
            <h3 className="text-xl font-black text-emerald-600 mt-1">₹{totalIncome.toLocaleString('en-IN')}</h3>
            <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md mt-1 inline-flex items-center gap-1">
              <TrendingUp size={10} /> Live Revenue Stream
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><ArrowUpRight size={20} /></div>
        </div>

        <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Total Outflows (Investments)</span>
            <h3 className="text-xl font-black text-rose-600 mt-1">₹{totalExpenses.toLocaleString('en-IN')}</h3>
            <span className="text-[9px] text-rose-600 font-bold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md mt-1 inline-flex items-center gap-1">
              <TrendingDown size={10} /> Cash Outflow
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600"><ArrowDownRight size={20} /></div>
        </div>

        <div className={clsx(
          "p-5 text-white rounded-2xl shadow-md flex items-center justify-between relative overflow-hidden transition-all duration-300",
          netProfit >= 0 ? "bg-gradient-to-br from-emerald-600 to-teal-700" : "bg-gradient-to-br from-rose-600 to-red-700"
        )}>
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
            <DollarSign size={100} />
          </div>
          <div className="z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Net Profit / Loss Buffer</span>
            <h3 className="text-xl font-black mt-1">₹{netProfit.toLocaleString('en-IN')}</h3>
            <span className="text-[9px] bg-white/20 border border-white/10 px-2 py-0.5 rounded-md font-extrabold mt-1.5 inline-block">
              {profitMargin}% Margin Status
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white/10 text-white z-10"><DollarSign size={20} /></div>
        </div>
      </div>

      {/* Visual Progress Bar Section */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5">
            <Activity size={14} className="text-slate-500 animate-pulse" />
            <span className="font-bold text-slate-700">Expense-to-Revenue Ratio</span>
          </div>
          <span className="font-extrabold text-slate-800">{expenseRatio}%</span>
        </div>
        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
          <div className={clsx("h-full rounded-full transition-all duration-1000", expenseRatio > 70 ? 'bg-red-500' : expenseRatio > 50 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(100, expenseRatio)}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          <span>Target Ideal: &lt;60%</span>
          <span>Current status: {expenseRatio <= 60 && totalIncome > 0 ? 'Healthy Margin' : 'Action Required'}</span>
        </div>
      </div>

      {/* Dynamic AI Insights System Bar */}
      <div className={clsx(
        "border rounded-3xl p-6 shadow-xs relative overflow-hidden transition-all duration-300",
        coachError ? "bg-rose-50 border-rose-100" : "bg-gradient-to-r from-emerald-50/70 to-teal-50/70 border-emerald-100"
      )}>
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
          <Sparkles size={160} className={coachError ? "text-rose-900" : "text-emerald-900"} />
        </div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className={clsx(coachError ? "text-rose-600" : "text-emerald-600 animate-pulse")} size={18} />
            <h3 className={clsx("font-black text-sm tracking-tight", coachError ? "text-rose-900" : "text-emerald-900")}>AI Profit &amp; Loss Strategy Guide</h3>
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
        <p className={clsx("text-xs whitespace-pre-line leading-relaxed font-medium", coachError ? "text-rose-800" : "text-emerald-800")}>
          {loadingCoach ? 'Analyzing your profit and loss statements with AI...' : coachAdvice}
        </p>
      </div>

      {/* Ledgers split-screen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inflows columns */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">Inflows (Sales Ledger)</h3>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl">₹{totalIncome.toLocaleString('en-IN')} Total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="text-left px-5 py-3.5">Details</th>
                  <th className="text-left px-5 py-3.5">Source</th>
                  <th className="text-right px-5 py-3.5">Amount</th>
                  <th className="text-center px-5 py-3.5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {income.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-gray-400 font-medium bg-white">
                      No sales entries logged yet. Click "Log Sales Inflow" to register a transaction!
                    </td>
                  </tr>
                ) : (
                  income.map((i: Income) => (
                    <tr key={i.id} className="hover:bg-slate-50/30 transition">
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">{i.description}</span>
                          <span className="text-[9px] text-gray-400 mt-0.5">{format(new Date(i.date), 'dd MMM yyyy')} · {i.customer || 'Walk-in'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-md text-[9px] bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border border-slate-200/50">{i.source}</span>
                      </td>
                      <td className="px-5 py-3 text-right font-extrabold text-slate-800">₹{i.amount.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3 text-center">
                        <button onClick={() => {
                          if (window.confirm('Are you sure you want to delete this sales inflow record?')) {
                            deleteSalesMutation.mutate(i.id)
                          }
                        }} disabled={deleteSalesMutation.isPending} className="text-gray-300 hover:text-red-500 transition p-1 hover:bg-red-50 rounded-lg cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Outflows columns */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">Outflows (Investment Ledger)</h3>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl">₹{totalExpenses.toLocaleString('en-IN')} Total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="text-left px-5 py-3.5">Details</th>
                  <th className="text-left px-5 py-3.5">Category</th>
                  <th className="text-right px-5 py-3.5">Amount</th>
                  <th className="text-center px-5 py-3.5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-gray-400 font-medium bg-white">
                      No investment outlays logged yet.
                    </td>
                  </tr>
                ) : (
                  expenses.map((e: Expense) => (
                    <tr key={e.id} className="hover:bg-slate-50/30 transition">
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">{e.description}</span>
                          <span className="text-[9px] text-gray-400 mt-0.5">{format(new Date(e.date), 'dd MMM yyyy')} {e.vendor && `· ${e.vendor}`}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-md text-[9px] bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border border-slate-200/50">{e.category.replace('_', ' ')}</span>
                      </td>
                      <td className="px-5 py-3 text-right font-extrabold text-slate-800">₹{e.amount.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3 text-center">
                        <button onClick={() => {
                          if (window.confirm('Are you sure you want to delete this investment outlay record?')) {
                            deleteExpenseMutation.mutate(e.id)
                          }
                        }} disabled={deleteExpenseMutation.isPending} className="text-gray-300 hover:text-red-500 transition p-1 hover:bg-red-50 rounded-lg cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Floating Chat Workspace Engine */}
      <div className="fixed bottom-6 right-6 z-50">
        {!chatOpen ? (
          <button onClick={() => setChatOpen(true)} className="bg-emerald-600 text-white rounded-2xl px-5 py-3.5 shadow-xl hover:bg-emerald-700 transition flex items-center gap-2 text-xs font-bold cursor-pointer hover:-translate-y-0.5 transform duration-200">
            <MessageSquare size={16} /> P&amp;L Margin Advice
          </button>
        ) : (
          <div className="bg-white rounded-3xl w-80 sm:w-96 h-[450px] shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-4 flex justify-between items-center shadow-md">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-emerald-200 animate-pulse" />
                <span className="font-black text-xs tracking-tight">BizBuddy AI P&amp;L Coach</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-emerald-100 hover:text-white transition cursor-pointer p-1 rounded-lg hover:bg-white/10"><X size={16} /></button>
            </div>
            
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
              {chatHistory.map((chat, idx) => (
                <div key={idx} className={clsx("max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs", chat.role === 'user' ? "bg-emerald-600 text-white ml-auto rounded-tr-sm" : "bg-white text-gray-800 border border-gray-100 rounded-tl-sm")}>
                  <p className="whitespace-pre-wrap">{chat.content}</p>
                </div>
              ))}
              {sendingChat && (
                <div className="text-[10px] text-gray-400 animate-pulse px-2 flex items-center gap-1 font-bold">
                  <Sparkles size={11} className="animate-spin text-emerald-500" />
                  Analyzing P&amp;L margins...
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Prompts inside Chatbot */}
            {chatHistory.length === 1 && (
              <div className="px-4 py-2 flex flex-wrap gap-1.5 bg-slate-50 border-t border-gray-50">
                <button onClick={() => handleSendChat('How can I reduce my losses?')} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg hover:border-emerald-500 hover:text-emerald-600 transition cursor-pointer font-medium shadow-2xs">How to reduce losses?</button>
                <button onClick={() => handleSendChat('How do I increase my profit margins?')} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg hover:border-emerald-500 hover:text-emerald-600 transition cursor-pointer font-medium shadow-2xs">How to increase profits?</button>
                <button onClick={() => handleSendChat('Is my expense ratio healthy?')} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg hover:border-emerald-500 hover:text-emerald-600 transition cursor-pointer font-medium shadow-2xs">Is my expense ratio healthy?</button>
              </div>
            )}
            
            <div className="p-3 border-t border-gray-50 flex gap-2 bg-white">
              <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} placeholder="Ask how to improve P&L performance..." className="flex-1 border border-gray-200 bg-gray-50 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 focus:bg-white transition" />
              <button onClick={() => handleSendChat()} disabled={!chatMessage.trim() || sendingChat} className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl transition cursor-pointer disabled:opacity-30"><Send size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Sales Entry Modal dialog */}
      {showSalesForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
              <h2 className="font-black text-slate-800 text-base tracking-tight">Record Sales Inflow</h2>
              <button onClick={() => setShowSalesForm(false)} className="text-gray-400 hover:text-gray-600 transition cursor-pointer"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit((d) => createSalesMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Amount (₹)</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                  <input type="number" step="0.01" {...register('amount')} className="w-full text-xs pl-7 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white transition" placeholder="e.g. 15000" />
                </div>
                {errors.amount && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.amount.message}</p>}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Sales Description</label>
                <input {...register('description')} className="w-full mt-1 text-xs px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white transition" placeholder="e.g. Bulk wheat selling transaction" />
                {errors.description && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Source</label>
                  <select {...register('source')} className="w-full mt-1 text-xs px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white transition">
                    {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Payment Mode</label>
                  <select {...register('paymentMethod')} className="w-full mt-1 text-xs px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white transition">
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Date</label>
                  <input type="date" {...register('date')} className="w-full text-xs mt-1 px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white transition" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Customer Name</label>
                  <input {...register('customer')} className="w-full mt-1 text-xs px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white transition" placeholder="Optional" />
                </div>
              </div>

              <button type="submit" disabled={createSalesMutation.isPending} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-bold transition mt-2 cursor-pointer shadow-md flex items-center justify-center gap-2">
                {createSalesMutation.isPending ? 'Logging Sales...' : 'Save Inflow Record'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}