import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, ShieldAlert, Sparkles, MessageSquare, Send, X, ShoppingBag, Layers, AlertTriangle } from 'lucide-react'
import { aiApi } from '@/services/api'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

// ─── TYPES & SCHEMAS ────────────────────────────────────────────────────────
interface StockItem {
  id: string
  name: string
  category: string
  quantity: number
  lowStockThreshold: number
  costPrice: number
  sellingPrice: number
  vendor?: string
}

const STOCK_CATEGORIES = ['Raw Materials', 'Finished Goods', 'Packaging', 'Spices & Oils', 'Other']

const schema = z.object({
  name: z.string().min(1, 'Item name is required'),
  category: z.string().min(1, 'Category is required'),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative'),
  lowStockThreshold: z.coerce.number().min(1, 'Threshold must be at least 1'),
  costPrice: z.coerce.number().positive('Cost price must be greater than 0'),
  sellingPrice: z.coerce.number().positive('Selling price must be greater than 0'),
  vendor: z.string().optional(),
})
type FormData = z.infer<typeof schema>

// Normalizes any item (e.g. ones pulled from localStorage that may have been
// saved with stringified numbers) so quantity comparisons are always numeric.
function normalizeStockItem(item: any): StockItem {
  return {
    id: String(item.id),
    name: String(item.name ?? ''),
    category: String(item.category ?? 'Other'),
    quantity: Number(item.quantity) || 0,
    lowStockThreshold: Number(item.lowStockThreshold) || 1,
    costPrice: Number(item.costPrice) || 0,
    sellingPrice: Number(item.sellingPrice) || 0,
    vendor: item.vendor ? String(item.vendor) : undefined,
  }
}

export default function StocksPage() {
  const [showForm, setShowForm] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string | 'all'>('all')

  // ─── AI INSIGHT COACH STATES ──────────────────────────────────────────────
  const [coachAdvice, setCoachAdvice] = useState<string>('')
  const [loadingCoach, setLoadingCoach] = useState<boolean>(false)
  const [coachError, setCoachError] = useState<boolean>(false)
  const [chatOpen, setChatOpen] = useState<boolean>(false)
  const [chatMessage, setChatMessage] = useState<string>('')
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Namaste! I am your AI Stock Coach. Ask me anything about your inventory — restock priorities, margins, what to reorder first, or general business strategy for your stock.' }
  ])
  const [sendingChat, setSendingChat] = useState<boolean>(false)

  // ─── STOCKS STATE DATA ────────────────────────────────────────────────────
  // CRITICAL FIX: normalize every field to the correct type the moment it's
  // loaded from localStorage. Without this, quantity/lowStockThreshold can
  // end up as strings, and `item.quantity <= item.lowStockThreshold` silently
  // does a STRING comparison (e.g. "9" <= "10" is false), which makes the
  // low-stock warning look "stuck" or wrong after adding new stock.
  const [stocks, setStocks] = useState<StockItem[]>(() => {
    try {
      const stored = localStorage.getItem('bizbuddy_stocks_ledger')
      const parsed = stored ? JSON.parse(stored) : []
      if (!Array.isArray(parsed)) return []
      return parsed.map(normalizeStockItem)
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('bizbuddy_stocks_ledger', JSON.stringify(stocks))
    } catch (err) {
      console.error('Failed to save stocks:', err)
    }
  }, [stocks])

  // These are recomputed on every render from `stocks`, so they are always
  // "live" as long as quantity/lowStockThreshold are real numbers (see fix above).
  const lowStockItems = stocks.filter(item => item.quantity <= item.lowStockThreshold)
  const highStockItems = stocks.filter(item => item.quantity > item.lowStockThreshold)
  const filteredStocks = filterCategory === 'all' ? stocks : stocks.filter(s => s.category === filterCategory)
  const totalStockValue = stocks.reduce((sum, s) => sum + (s.quantity * s.costPrice), 0)

  // Form setup
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 10, lowStockThreshold: 5, category: 'Raw Materials' },
  })

  // ─── AI STOCK STRATEGY BANNER (real Gemini call, debounced) ───────────────
  // Builds a compact structured snapshot of the ledger so the model has real
  // numbers to reason over instead of guessing.
  const buildStockSnapshot = () => ({
    totalItems: stocks.length,
    totalStockValueWholesale: totalStockValue,
    totalStockValueRetail: stocks.reduce((sum, s) => sum + s.quantity * s.sellingPrice, 0),
    lowStockItems: lowStockItems.map(i => ({
      name: i.name,
      category: i.category,
      quantity: i.quantity,
      threshold: i.lowStockThreshold,
      deficit: i.lowStockThreshold - i.quantity,
      costPrice: i.costPrice,
      sellingPrice: i.sellingPrice,
      margin: i.sellingPrice - i.costPrice,
      vendor: i.vendor || null,
    })),
    highStockItems: highStockItems.map(i => ({
      name: i.name,
      category: i.category,
      quantity: i.quantity,
      threshold: i.lowStockThreshold,
      margin: i.sellingPrice - i.costPrice,
    })),
  })

  const fetchCoachData = async () => {
    if (stocks.length === 0) {
      setCoachAdvice('Add stock quantities above to get AI-powered restocking and margin advice.')
      setCoachError(false)
      return
    }

    setLoadingCoach(true)
    setCoachError(false)

    const snapshot = buildStockSnapshot()
    const prompt = `You are a stock/inventory advisor for a small Indian shop owner using BizBuddy AI.
Here is their current inventory snapshot as JSON:
${JSON.stringify(snapshot)}

Give a short, actionable restocking briefing (max ~80 words, plain text, no markdown headers).
Prioritize: 1) which items need urgent reorder and why (consider deficit size and margin, not just raw count), 2) total capital needed to restock urgent items, 3) one concrete tactical tip.
Use ₹ for currency. Be direct and practical, like a trusted business advisor, not generic.`

    try {
      const res = await aiApi.chat([{ role: 'user', content: prompt }])
      const text = res.data?.data?.content || res.data?.reply || ''
      if (!text) throw new Error('Empty AI response')
      setCoachAdvice(text)
    } catch (err) {
      console.error('AI Coach call failed:', err)
      setCoachError(true)
      setCoachAdvice('Could not reach the AI Coach right now. Tap "Recalculate" to try again.')
    } finally {
      setLoadingCoach(false)
    }
  }

  // Debounce: only call the AI ~800ms after stocks settle, so rapid add/delete
  // actions don't fire a Gemini request per keystroke/action.
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCoachData()
    }, 800)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stocks])

  // ─── ACTIONS ──────────────────────────────────────────────────────────────
  const handleAddStock = (data: FormData) => {
    // Belt-and-suspenders: even though zod's z.coerce.number() should already
    // produce numbers, we force-cast again here so a future schema change
    // (or a resolver quirk) can never reintroduce string quantities.
    const newItem: StockItem = {
      id: Date.now().toString(),
      name: data.name,
      category: data.category,
      vendor: data.vendor,
      quantity: Number(data.quantity),
      lowStockThreshold: Number(data.lowStockThreshold),
      costPrice: Number(data.costPrice),
      sellingPrice: Number(data.sellingPrice),
    }
    setStocks(prev => [newItem, ...prev])
    toast.success(`${data.name} added to stock ledger`)
    setShowForm(false)
    reset()
  }

  const handleDeleteStock = (id: string) => {
    setStocks(prev => prev.filter(item => item.id !== id))
    toast.success('Stock entry removed')
  }

  // ─── AI CHATBOT — real Gemini call with conversation memory ───────────────
  const handleSendChat = async () => {
    if (!chatMessage.trim() || sendingChat) return
    const userText = chatMessage.trim()

    const updatedHistory = [...chatHistory, { sender: 'user' as const, text: userText }]
    setChatHistory(updatedHistory)
    setChatMessage('')
    setSendingChat(true)

    const snapshot = buildStockSnapshot()

    // System-style context message: sent once per request so the model always
    // has fresh, accurate numbers (stocks can change between messages).
    const contextMessage = {
      role: 'user' as const,
      content: `You are the AI Stock Coach inside BizBuddy AI, a business assistant for a small Indian shop owner.
Current inventory snapshot (JSON, always treat this as the live, accurate source of truth — ignore any older numbers from earlier in the conversation):
${JSON.stringify(snapshot)}

Answer the owner's questions about their stock conversationally and practically. When relevant, reason about restock priority using deficit size AND margin (high-margin items running low matter more than low-margin ones), not just raw quantity. Use ₹ for money. Keep answers concise (under 100 words) unless the owner asks for detail. Do not use markdown headers or bullet symbols other than plain "-" or "•".`
    }

    // Carry real conversation history (minus the seed greeting) so the model
    // has memory across turns, plus the fresh context message, plus the new question.
    const historyForApi = chatHistory
      .filter((_, idx) => idx > 0) // drop the static intro greeting
      .map(m => ({ role: m.sender === 'user' ? 'user' as const : 'assistant' as const, content: m.text }))

    try {
      const res = await aiApi.chat([
        contextMessage,
        ...historyForApi,
        { role: 'user', content: userText },
      ])
      const aiText = res.data?.data?.content || res.data?.reply || ''
      if (!aiText) throw new Error('Empty AI response')
      setChatHistory(prev => [...prev, { sender: 'ai', text: aiText }])
    } catch (err) {
      console.error('AI chat call failed:', err)
      setChatHistory(prev => [...prev, { sender: 'ai', text: "I couldn't reach the AI service just now — please check your connection and try again." }])
    } finally {
      setSendingChat(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Store Stock & Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track current stock levels, monitor unit thresholds, and avoid business sales disruptions.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 font-semibold transition">
          <Plus size={16} /> Add New Stock Item
        </button>
      </div>

      {/* ─── Metric Summaries ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Layers size={22} /></div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unique Stock Lines</p>
            <p className="text-xl font-bold text-slate-800">{stocks.length} Items</p>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><AlertTriangle size={22} /></div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Low Stock Warnings</p>
            <p className={clsx("text-xl font-bold", lowStockItems.length > 0 ? "text-amber-600" : "text-slate-800")}>
              {lowStockItems.length} items run low
            </p>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><ShoppingBag size={22} /></div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Value on Hand</p>
            <p className="text-xl font-bold text-slate-800">₹{totalStockValue.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* ─── Category Filter Navigation ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory('all')}
          className={clsx('px-3 py-1.5 rounded-full text-xs font-medium transition', filterCategory === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
        >
          All Categories
        </button>
        {STOCK_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={clsx('px-3 py-1.5 rounded-full text-xs font-medium transition', filterCategory === cat ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ─── Inventory Table Ledger ─────────────────────────────────────────── */}
      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b text-slate-500 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3">Item Details</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3 text-center">Stock Count</th>
              <th className="px-5 py-3 text-right">Cost Price</th>
              <th className="px-5 py-3 text-right">Selling Price</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredStocks.map((item) => {
              const isLow = item.quantity <= item.lowStockThreshold
              return (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-800">{item.name}</p>
                    {item.vendor && <p className="text-[11px] text-slate-400">Supplier: {item.vendor}</p>}
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{item.category}</td>
                  <td className="px-5 py-3 text-center font-mono font-bold text-slate-800">
                    {item.quantity} <span className="text-[10px] text-slate-400 font-normal">/ threshold ({item.lowStockThreshold})</span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-slate-600">₹{item.costPrice}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-slate-900">₹{item.sellingPrice}</td>
                  <td className="px-5 py-3 text-center">
                    {isLow ? (
                      <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 font-bold text-[10px] uppercase px-2.5 py-1 rounded-full ring-1 ring-rose-200">
                        <ShieldAlert size={10} /> Restock Needed
                      </span>
                    ) : (
                      <span className="inline-flex items-center bg-emerald-50 text-emerald-700 font-semibold text-[10px] uppercase px-2.5 py-1 rounded-full">
                        Healthy Count
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => handleDeleteStock(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {filteredStocks.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                  No stock tracking data found under this segment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── 💡 AI STOCK STRATEGY BANNER HUB ────────────────────────────────── */}
      <div className={clsx(
        "border rounded-2xl p-5 shadow-sm",
        coachError ? "bg-rose-50 border-rose-200" : "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200"
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className={coachError ? "text-rose-600" : "text-emerald-600"} size={18} />
            <h3 className={clsx("font-bold text-sm", coachError ? "text-rose-900" : "text-emerald-900")}>AI Stock Optimization Coach</h3>
          </div>
          <button
            onClick={fetchCoachData}
            disabled={loadingCoach}
            className={clsx(
              "text-[11px] text-white px-2.5 py-1 rounded-lg font-medium disabled:opacity-50 transition",
              coachError ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            {loadingCoach ? 'Asking AI Coach...' : 'Recalculate Restock Targets'}
          </button>
        </div>
        <p className={clsx("text-xs whitespace-pre-line leading-relaxed", coachError ? "text-rose-800" : "text-emerald-800")}>
          {loadingCoach ? 'Analyzing your inventory with AI...' : (coachAdvice || "Compile entries to populate automated AI supply alerts.")}
        </p>
      </div>

      {/* ─── 💬 FLOATING CHATBOT INTERFACE ──────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50">
        {!chatOpen ? (
          <button
            onClick={() => setChatOpen(true)}
            className="bg-emerald-600 text-white rounded-full p-3.5 shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2 text-sm font-semibold"
          >
            <MessageSquare size={18} />
            <span>Ask AI Stock Coach</span>
          </button>
        ) : (
          <div className="bg-white rounded-2xl w-80 h-96 shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="bg-emerald-600 text-white p-3.5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles size={15} />
                <span className="font-bold text-xs">AI Stock Coach</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="hover:opacity-70 text-white"><X size={16} /></button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-[11px] bg-slate-50/80">
              {chatHistory.map((chat, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    "max-w-[85%] rounded-xl p-2.5 whitespace-pre-line shadow-sm leading-relaxed",
                    chat.sender === 'user' ? "bg-emerald-600 text-white ml-auto" : "bg-white text-slate-800 border border-slate-100"
                  )}
                >
                  {chat.text}
                </div>
              ))}
              {sendingChat && <div className="text-slate-400 text-[10px] animate-pulse font-medium">AI Coach is thinking...</div>}
            </div>

            <div className="p-2 border-t flex gap-2 bg-white">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Ask me anything about your stock..."
                disabled={sendingChat}
                className="flex-1 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-600 text-slate-800 bg-slate-50 disabled:opacity-60"
              />
              <button onClick={handleSendChat} disabled={sendingChat} className="bg-emerald-600 text-white p-1.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">
                <Send size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Add Stock Entry Modal ──────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-bold text-slate-800 text-base">Log New Stock Profile</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-100"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit(handleAddStock)} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Item Name</label>
                <input {...register('name')} className="w-full border rounded-lg p-2 bg-slate-50" placeholder="e.g. Premium Basmati Rice Bags" />
                {errors.name && <p className="text-rose-500 mt-0.5">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Category</label>
                  <select {...register('category')} className="w-full border rounded-lg p-2 bg-slate-50">
                    {STOCK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Supplier Vendor</label>
                  <input {...register('vendor')} className="w-full border rounded-lg p-2 bg-slate-50" placeholder="Optional supplier name" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Current Stock Count</label>
                  <input type="number" {...register('quantity')} className="w-full border rounded-lg p-2 bg-slate-50" />
                  {errors.quantity && <p className="text-rose-500 mt-0.5">{errors.quantity.message}</p>}
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Low-Alert Threshold</label>
                  <input type="number" {...register('lowStockThreshold')} className="w-full border rounded-lg p-2 bg-slate-50" />
                  {errors.lowStockThreshold && <p className="text-rose-500 mt-0.5">{errors.lowStockThreshold.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Wholesale Cost (₹)</label>
                  <input type="number" step="0.01" {...register('costPrice')} className="w-full border rounded-lg p-2 bg-slate-50" />
                  {errors.costPrice && <p className="text-rose-500 mt-0.5">{errors.costPrice.message}</p>}
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Retail Shelf Price (₹)</label>
                  <input type="number" step="0.01" {...register('sellingPrice')} className="w-full border rounded-lg p-2 bg-slate-50" />
                  {errors.sellingPrice && <p className="text-rose-500 mt-0.5">{errors.sellingPrice.message}</p>}
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg hover:bg-emerald-700 transition mt-2">
                Commit Item to Stock Ledger
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}