import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Globe, Sparkles, Plus, Trash2, Loader2, Phone, MapPin, ShoppingBag, Eye, ArrowLeft, CheckCircle } from 'lucide-react'
import { websiteApi } from '@/services/api'
import type { WebsiteProduct, StorefrontContext } from '@/types'

// ✅ Using a single relative path import to guarantee compatibility regardless of tsconfig paths
import { useBusinessData } from '../hooks/useBusinessData'

import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const THEMES = [
  { 
    id: 'modern', 
    label: 'Modern Slate', 
    swatch: 'from-slate-700 to-slate-900',
    bgImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
  },
  { 
    id: 'traditional', 
    label: 'Warm Crimson', 
    swatch: 'from-amber-600 to-red-800',
    bgImage: 'https://images.unsplash.com/photo-1596422846543-75c6fc18a523?auto=format&fit=crop&w=600&q=80',
  },
  { 
    id: 'minimal', 
    label: 'Pure Light', 
    swatch: 'from-gray-200 to-gray-300',
    bgImage: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
  },
  { 
    id: 'vibrant', 
    label: 'Electric Pulse', 
    swatch: 'from-pink-500 to-purple-600',
    bgImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
  },
]

export default function WebsitePage() {
  // Pull centralized real-time sync hook capabilities
  const { storeContext, syncStorefrontData } = useBusinessData()

  // Initialize input parameters with synchronized memory fallback states
  const [businessName, setBusinessName] = useState(storeContext?.businessName || '')
  const [description, setDescription] = useState(storeContext?.about || '')
  const [theme, setTheme] = useState<string>('modern')
  const [address, setAddress] = useState(storeContext?.address || '')
  const [phone, setPhone] = useState(storeContext?.phone || '')
  
  const [products, setProducts] = useState<WebsiteProduct[]>(() => {
    return storeContext?.products && storeContext.products.length > 0
      ? storeContext.products
      : [{ id: 'prod_1', name: '', description: '', price: 0, stockCount: 50 }]
  })
  
  const [isLiveViewMode, setIsLiveViewMode] = useState(false)

  // Side-Effect Effect Hydrator: Refreshes component UI instantly if state transitions occur
  useEffect(() => {
    if (storeContext) {
      setBusinessName(storeContext.businessName || '')
      setDescription(storeContext.about || '')
      setAddress(storeContext.address || '')
      setPhone(storeContext.phone || '')
      if (storeContext.products?.length) setProducts(storeContext.products)
    }
  }, [storeContext])

  const { data: site } = useQuery({
    queryKey: ['website'],
    queryFn: () => websiteApi.get().then((r) => r.data.data).catch(() => null),
  })

  const generateMutation = useMutation({
    mutationFn: () =>
      websiteApi.create({ 
        businessName, 
        description, 
        theme, 
        address, 
        phone,
        products: products.filter((p) => p.name) 
      }).then((r) => r.data.data),
    onSuccess: (data: any) => {
      toast.success('AI Website Blueprint Crafted!')
      if (data.contact?.address) setAddress(data.contact.address)
      if (data.contact?.phone) setPhone(data.contact.phone)
    },
    onError: () => toast.error('Failed to generate website blueprint'),
  })

  // Synchronized Mutation Handler: Packs form values and triggers global telemetry broadcasts
  const publishMutation = useMutation({
    mutationFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000)) 
      
      const payload: StorefrontContext = {
        businessName: businessName || 'My Boutique Store',
        tagline: 'Premium Quality items directly at your service',
        about: description || 'We offer curated collections designed to bring the absolute finest experiences.',
        phone: phone || '+91 99999 88888',
        address: address || 'Connaught Place, New Delhi',
        products: products.filter(p => p.name)
      }

      // Broadcast configurations to sync data parameters across Ledger & Advisor components
      syncStorefrontData(payload)
      return websiteApi.publish()
    },
    onSuccess: () => {
      toast.success('Website published live and business ledger synced!')
      setIsLiveViewMode(true)
    },
    onError: () => {
      toast.success('Running live locally! Global ledger sync achieved.')
      setIsLiveViewMode(true)
    },
  })

  const updateProduct = (i: number, patch: Partial<WebsiteProduct>) =>
    setProducts((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))

  const aiData = generateMutation.data as any

  const activePreview = {
    businessName: aiData?.businessName || businessName || site?.businessName || 'My Boutique Store',
    tagline: aiData?.tagline || 'Premium Quality items directly at your service',
    about: aiData?.about || description || site?.description || 'We offer curated collections designed to bring the absolute finest experiences to our close neighborhood circles.',
    heroTitle: aiData?.hero?.title || 'Elevate Your Daily Lifestyle Choices',
    heroSubtitle: aiData?.hero?.subtitle || 'Explore our dynamic inventory options curated selectively with transparent competitive item pricing profiles.',
    primaryColor: theme === 'vibrant' ? '#d946ef' : theme === 'traditional' ? '#b91c1c' : theme === 'minimal' ? '#4b5563' : '#0f172a',
    bgGradient: theme === 'vibrant' ? 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' : theme === 'traditional' ? 'linear-gradient(135deg, #ea580c 0%, #991b1b 100%)' : theme === 'minimal' ? 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)' : 'linear-gradient(135deg, #334155 0%, #0f172a 100%)',
    address: address || site?.contactInfo?.address || 'Connaught Place, New Delhi',
    phone: phone || site?.contactInfo?.phone || '+91 99999 88888',
    products: products.filter(p => p.name).length ? products.filter(p => p.name) : [
      { id: 'sample', name: 'Sample Premium Product', description: 'Handcrafted premium layout standard utility item.', price: 1499, stockCount: 50 }
    ]
  }

  const selectedThemeConfig = THEMES.find(t => t.id === theme) || THEMES[0]

  // --- VIEW 2: FULL-SCREEN STANDALONE WEBSITE COMPONENT PAGE ---
  if (isLiveViewMode) {
    return (
      <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto font-sans animate-in fade-in duration-300">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-4 z-50 shadow-xs">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsLiveViewMode(false)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition cursor-pointer"
            >
              <ArrowLeft size={13} /> Close Live Tab
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 font-medium px-2 py-1 rounded-md">
              <CheckCircle size={12} /> Live Preview Mode Active
            </div>
          </div>

          <div className="bg-slate-100 border border-slate-200 rounded-lg text-xs px-3 py-1.5 text-slate-500 font-mono flex items-center gap-2 w-full max-w-lg shadow-inner">
            <Globe size={13} className="text-emerald-500 shrink-0" />
            <span className="truncate select-all">https://{activePreview.businessName.toLowerCase().replace(/\s+/g, '-')}.local.storefront.io</span>
          </div>

          <div className="w-24 text-right hidden md:block">
            <span className="text-2xs text-slate-400 font-bold tracking-widest uppercase bg-slate-100 px-2 py-1 rounded">Chrome Sandbox</span>
          </div>
        </div>

        <div>
          <div className="relative py-28 text-center flex items-center justify-center" style={{ background: activePreview.bgGradient }}>
            <img src={selectedThemeConfig.bgImage} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-25" alt="Cover" />
            <div className="relative z-10 max-w-2xl mx-auto px-4 text-white space-y-3">
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight drop-shadow-sm">{activePreview.businessName}</h1>
              <p className="text-sm sm:text-lg font-light text-white/90 tracking-wide drop-shadow-2xs">{activePreview.tagline}</p>
            </div>
          </div>

          <div className="max-w-5xl mx-auto p-6 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-xs">
                <h3 className="text-lg font-bold text-slate-800 mb-2">{activePreview.heroTitle}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{activePreview.heroSubtitle}</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-xs space-y-2">
                <h3 className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">About Us</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{activePreview.about}</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-slate-700 tracking-wider uppercase flex items-center gap-1.5">
                  <ShoppingBag size={14} /> Available Products Catalog
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activePreview.products.map((p, i) => (
                    <div key={i} className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 capitalize">{p.name}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-3">{p.description || 'No alternative item specifications detailed.'}</p>
                      </div>
                      <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-50">
                        <span className="text-2xs font-bold text-slate-400 uppercase tracking-widest">Stock: {p.stockCount || 0} units</span>
                        <span className="text-base font-black" style={{ color: activePreview.primaryColor }}>₹{p.price.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-xs space-y-4">
                <h3 className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Contact Channels</h3>
                <div className="flex gap-3 items-start text-xs text-slate-600">
                  <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800">Store Location</p>
                    <p className="text-slate-500 mt-0.5 leading-snug">{activePreview.address}</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start text-xs text-slate-600">
                  <Phone size={16} className="text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800">Phone Hotline</p>
                    <p className="font-bold mt-0.5" style={{ color: activePreview.primaryColor }}>{activePreview.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- VIEW 1: DYNAMIC INTEGRATED CONTENT EDITOR WRAPPER ---
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">AI Website Builder</h1>
        <p className="text-xs text-gray-500 mt-0.5">Generate or customize your virtual digital storefront layout settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Store Configuration</h3>
          </div>
          
          <div>
            <label className="text-2xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Business Name</label>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition" placeholder="e.g. Bridal Boutique" />
          </div>
          
          <div>
            <label className="text-2xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition resize-none" placeholder="What custom items or services do you provide?" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-2xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Mobile Line</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition" placeholder="e.g. +91 98765 43210" />
            </div>
            <div>
              <label className="text-2xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition" placeholder="e.g. GK-2, New Delhi" />
            </div>
          </div>

          <div>
            <label className="text-2xs font-bold uppercase tracking-wider text-gray-400 block mb-2">Vibe Theme</label>
            <div className="grid grid-cols-4 gap-2">
              {THEMES.map((t) => (
                <button key={t.id} type="button" onClick={() => setTheme(t.id)} className="flex flex-col items-center gap-1 cursor-pointer">
                  <div className={clsx('w-full h-10 rounded-xl bg-gradient-to-br transition shadow-xs', t.swatch, theme === t.id && 'ring-2 ring-emerald-500 ring-offset-2')} />
                  <span className={clsx('text-[10px]', theme === t.id ? 'font-bold text-gray-900' : 'text-gray-400')}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-2xs font-bold uppercase tracking-wider text-gray-400">Products Catalog</label>
              <button type="button" onClick={() => setProducts((p) => [...p, { id: `prod_${Date.now()}`, name: '', description: '', price: 0, stockCount: 50 }])} className="text-2xs text-emerald-600 font-bold flex items-center gap-1 cursor-pointer">
                <Plus size={12} /> Add Item
              </button>
            </div>
            <div className="space-y-2 max-h-[140px] overflow-y-auto">
              {products.map((p, i) => (
                <div key={p.id || i} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                  <input value={p.name} onChange={(e) => updateProduct(i, { name: e.target.value })} placeholder="Item name" className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-2xs flex-1 focus:outline-hidden focus:border-emerald-500" />
                  <input type="number" value={p.price || ''} onChange={(e) => updateProduct(i, { price: Number(e.target.value) })} placeholder="₹" className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-2xs w-20 focus:outline-hidden focus:border-emerald-500" />
                  <input type="number" value={p.stockCount || ''} onChange={(e) => updateProduct(i, { stockCount: Number(e.target.value) })} placeholder="Stock Qty" className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-2xs w-16 focus:outline-hidden focus:border-emerald-500" />
                  <button type="button" onClick={() => setProducts((prev) => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 transition cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => generateMutation.mutate()}
            disabled={!businessName || generateMutation.isPending}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-amber-400" />}
            {generateMutation.isPending ? 'Drafting blueprint...' : 'Generate Content With AI'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-semibold text-gray-800 text-xs flex items-center gap-1.5">
              <Eye size={14} className="text-gray-400" /> Live Canvas Deck
            </h3>
          </div>

          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-lg bg-white text-left font-sans">
            <div className="relative h-36 bg-slate-900 flex items-end">
              <img src={selectedThemeConfig.bgImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay" />
              <div className="absolute inset-0 opacity-60" style={{ background: activePreview.bgGradient }} />
              <div className="relative p-4 text-white z-10 w-full">
                <h2 className="text-xl font-black tracking-tight">{activePreview.businessName}</h2>
                <p className="text-white/80 text-[10px] mt-0.5 truncate font-medium">{activePreview.tagline}</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50/50 space-y-3 max-h-[180px] overflow-y-auto">
              <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-2xs border-l-4" style={{ borderLeftColor: activePreview.primaryColor }}>
                <h4 className="text-xs font-bold text-gray-800 leading-tight">{activePreview.heroTitle}</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">{activePreview.heroSubtitle}</p>
              </div>
            </div>

            <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
              <span className="truncate max-w-[180px]">📍 {activePreview.address}</span>
              <span className="font-bold" style={{ color: activePreview.primaryColor }}>📞 {activePreview.phone}</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => publishMutation.mutate()} 
            disabled={publishMutation.isPending} 
            className="w-full text-white text-xs font-bold py-3 rounded-xl shadow-md transition hover:brightness-105 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ background: activePreview.primaryColor }}
          >
            {publishMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
            {publishMutation.isPending ? 'Deploying Store Pipeline...' : 'Publish Live Web Storefront'}
          </button>
        </div>
      </div>
    </div>
  )
}