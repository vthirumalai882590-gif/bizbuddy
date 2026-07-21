import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Megaphone, Sparkles, Instagram, Facebook, Twitter, MessageSquare, Calendar, Send, Copy } from 'lucide-react'
import { aiApi } from '@/services/api'
import type { MarketingPost, Platform } from '@/types'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const FESTIVALS = [
  { name: 'Diwali',        date: 'Oct 2024',  emoji: '🪔' },
  { name: 'Dussehra',      date: 'Oct 2024',  emoji: '🏹' },
  { name: 'Navratri',      date: 'Oct 2024',  emoji: '💃' },
  { name: 'Eid',           date: 'Apr 2025',  emoji: '🌙' },
  { name: 'Christmas',     date: 'Dec 2024',  emoji: '🎄' },
  { name: 'Holi',          date: 'Mar 2025',  emoji: '🎨' },
  { name: 'Independence',  date: 'Aug 2024',  emoji: '🇮🇳' },
  { name: 'New Year',      date: 'Jan 2025',  emoji: '🎆' },
]

// Platform identity: gradient header + bubble color + accent used across the preview card
const PLATFORM_CONFIG: Record<Platform, {
  icon: React.ElementType
  color: string
  label: string
  headerGradient: string
  avatarGradient: string
  tagColor: string
  ring: string
}> = {
  instagram: {
    icon: Instagram, color: 'text-pink-600', label: 'Instagram',
    headerGradient: 'from-amber-400 via-pink-500 to-purple-600',
    avatarGradient: 'from-amber-400 via-pink-500 to-purple-600',
    tagColor: 'text-pink-600 bg-pink-50 border-pink-100',
    ring: 'ring-pink-200',
  },
  facebook: {
    icon: Facebook, color: 'text-blue-600', label: 'Facebook',
    headerGradient: 'from-blue-500 to-blue-700',
    avatarGradient: 'from-blue-500 to-blue-700',
    tagColor: 'text-blue-600 bg-blue-50 border-blue-100',
    ring: 'ring-blue-200',
  },
  twitter: {
    icon: Twitter, color: 'text-sky-500', label: 'X / Twitter',
    headerGradient: 'from-slate-700 to-slate-900',
    avatarGradient: 'from-slate-700 to-slate-900',
    tagColor: 'text-slate-600 bg-slate-100 border-slate-200',
    ring: 'ring-slate-300',
  },
  whatsapp: {
    icon: MessageSquare, color: 'text-green-600', label: 'WhatsApp',
    headerGradient: 'from-emerald-400 to-green-600',
    avatarGradient: 'from-emerald-400 to-green-600',
    tagColor: 'text-green-600 bg-green-50 border-green-100',
    ring: 'ring-green-200',
  },
}

const MOCK_POSTS: MarketingPost[] = [
  {
    id: '1', userId: 'u1', platform: 'instagram',
    content: '🪔 This Diwali, light up your celebrations with our special festival offers! Get 20% off on all products. Shop now and brighten your home this festive season! 🎆✨',
    hashtags: ['#Diwali2024', '#FestiveOffers', '#Sale', '#DiwaliShopping'],
    status: 'published',
    publishedAt: new Date('2024-10-15'),
    engagementHints: ['Post between 7-9pm', 'Add product photos', 'Use Stories too'],
    createdAt: new Date(),
  },
]

export default function MarketingPage() {
  const [activeTab, setActiveTab]       = useState<'create' | 'posts' | 'festivals'>('create')
  const [selectedPlatform, setPlatform] = useState<Platform>('instagram')
  const [selectedFestival, setFestival] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [generatedPost, setGeneratedPost] = useState<{
    versions: Array<{
      style: string;
      content: string;
      hashtags: string[];
      banner: { headline: string; subheadline: string; promoTag: string }
    }>
  } | null>(null)
  const [activeVersionIndex, setActiveVersionIndex] = useState(0)
  const [previewMode, setPreviewMode] = useState<'graphic' | 'caption'>('graphic')

  const generateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => aiApi.generateMarketing(data).then(r => r.data.data),
    onSuccess: (data) => {
      setGeneratedPost(data)
      setActiveVersionIndex(0)
    },
    onError:   () => toast.error('Failed to generate post'),
  })

  const handleGenerate = () => {
    generateMutation.mutate({
      platform: selectedPlatform,
      festival: selectedFestival,
      prompt:   customPrompt,
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied!')
  }

  const festivalEmoji = FESTIVALS.find(f => f.name === selectedFestival)?.emoji
  const cfg = PLATFORM_CONFIG[selectedPlatform]
  const Icon = cfg.icon

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Marketing</h1>
        <p className="section-subtitle">AI-powered social media content for your business</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { id: 'create',   label: 'Create Post' },
          { id: 'posts',    label: 'My Posts' },
          { id: 'festivals',label: 'Festivals' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Create post tab */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Config panel */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Post Settings</h3>

              {/* Platform */}
              <div className="mb-4">
                <label className="label">Platform</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(([id, c]) => {
                    const PIcon = c.icon
                    return (
                      <button
                        key={id}
                        onClick={() => setPlatform(id)}
                        className={clsx(
                          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                          selectedPlatform === id
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        )}
                      >
                        <PIcon size={16} className={selectedPlatform === id ? 'text-brand-600' : c.color} />
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Festival */}
              <div className="mb-4">
                <label className="label">Festival / Occasion (optional)</label>
                <select
                  value={selectedFestival}
                  onChange={e => setFestival(e.target.value)}
                  className="input"
                >
                  <option value="">No specific festival</option>
                  {FESTIVALS.map(f => (
                    <option key={f.name} value={f.name}>{f.emoji} {f.name} · {f.date}</option>
                  ))}
                </select>
              </div>

              {/* Custom prompt */}
              <div className="mb-4">
                <label className="label">Additional instructions (optional)</label>
                <textarea
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="E.g. Promote our new product, highlight 20% discount, target families..."
                  rows={3}
                  className="input resize-none"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-fuchsia-500 via-pink-500 to-amber-500 shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 transition-all disabled:opacity-60"
              >
                {generateMutation.isPending ? (
                  <Sparkles size={16} className="animate-pulse" />
                ) : (
                  <Sparkles size={16} />
                )}
                {generateMutation.isPending ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>
          </div>

          {/* Preview panel */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {/* Festival ambient glow */}
            {festivalEmoji && (
              <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-amber-200/60 via-pink-200/50 to-transparent blur-2xl" />
            )}

            <div className="relative p-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <h3 className="font-semibold text-gray-900">Preview</h3>
                {generatedPost && (
                  <div className="flex gap-1 bg-gray-50 rounded-full p-1 border border-gray-100">
                    {generatedPost.versions.map((v, index) => (
                      <button
                        key={v.style}
                        onClick={() => setActiveVersionIndex(index)}
                        className={clsx(
                          'px-3 py-1 rounded-full text-[10px] font-extrabold capitalize transition-all cursor-pointer',
                          activeVersionIndex === index
                            ? `bg-gradient-to-r ${cfg.headerGradient} text-white shadow-sm`
                            : 'text-gray-500 hover:text-gray-900'
                        )}
                      >
                        {v.style.split(' / ')[1] || v.style.split(' & ')[1] || v.style.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {generatedPost ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Mode Selector */}
                  <div className="flex gap-1 bg-gray-50 border border-gray-100 p-1 rounded-xl w-full">
                    <button
                      onClick={() => setPreviewMode('graphic')}
                      className={clsx(
                        'flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
                        previewMode === 'graphic'
                          ? `bg-gradient-to-r ${cfg.headerGradient} text-white shadow-xs`
                          : 'text-gray-500 hover:text-gray-900'
                      )}
                    >
                      Graphic Poster Preview
                    </button>
                    <button
                      onClick={() => setPreviewMode('caption')}
                      className={clsx(
                        'flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
                        previewMode === 'caption'
                          ? `bg-gradient-to-r ${cfg.headerGradient} text-white shadow-xs`
                          : 'text-gray-500 hover:text-gray-900'
                      )}
                    >
                      Social Feed Caption
                    </button>
                  </div>

                  {previewMode === 'graphic' ? (
                    /* Dynamic Graphic Card Poster */
                    <div
                      className={clsx(
                        'w-full aspect-square rounded-2xl relative flex flex-col items-center justify-center p-6 text-white text-center shadow-lg overflow-hidden transition-all duration-300 bg-gradient-to-br',
                        selectedFestival === 'Diwali' || selectedFestival === 'Dussehra' || selectedFestival === 'Navratri'
                          ? 'from-amber-400 via-orange-500 to-rose-600'
                          : selectedFestival === 'Christmas'
                          ? 'from-emerald-800 via-green-700 to-rose-700'
                          : selectedFestival === 'Eid'
                          ? 'from-emerald-700 to-teal-900'
                          : selectedFestival === 'Holi'
                          ? 'from-pink-500 via-purple-500 to-sky-400'
                          : cfg.headerGradient
                      )}
                    >
                      {/* Decorative shapes */}
                      <div className="absolute top-4 left-4 text-3xl opacity-20 select-none animate-pulse">{festivalEmoji || '✨'}</div>
                      <div className="absolute bottom-4 right-4 text-3xl opacity-20 select-none animate-pulse">{festivalEmoji || '✨'}</div>
                      <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
                      <div className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />

                      {/* Glassmorphic poster panel */}
                      <div className="w-full bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col items-center">
                        <span className="tracking-[0.25em] text-[9px] font-black text-amber-200/90 uppercase mb-2">YOUR STORE FRONT</span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight uppercase mb-2 text-white drop-shadow-md">
                          {generatedPost.versions[activeVersionIndex].banner?.headline || 'SPECIAL OFFER'}
                        </h2>
                        <p className="text-xs font-medium text-white/90 leading-relaxed mb-4 max-w-[240px]">
                          {generatedPost.versions[activeVersionIndex].banner?.subheadline || 'Exclusive deals & new collections inside'}
                        </p>
                        {generatedPost.versions[activeVersionIndex].banner?.promoTag && (
                          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black bg-white text-slate-800 shadow-md hover:scale-105 transition transform duration-200 uppercase tracking-wider">
                            {generatedPost.versions[activeVersionIndex].banner.promoTag}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Social Post Feed Card */
                    <div className="space-y-4">
                      {/* Platform header strip */}
                      <div className={clsx('flex items-center justify-between text-xs font-semibold rounded-lg px-3 py-2 bg-gradient-to-r text-white', cfg.headerGradient)}>
                        <div className="flex items-center gap-2">
                          <Icon size={16} />
                          {cfg.label}
                          {festivalEmoji && <span className="text-sm">{festivalEmoji}</span>}
                        </div>
                        <span className="text-[10px] uppercase font-black bg-white/25 px-2 py-0.5 rounded-md backdrop-blur-sm">
                          {generatedPost.versions[activeVersionIndex].style}
                        </span>
                      </div>

                      {/* Post card */}
                      <div className={clsx('rounded-xl p-4 bg-white border shadow-sm ring-1 ring-inset', cfg.ring, 'border-gray-100')}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br shadow-sm', cfg.avatarGradient)}>
                            B
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Your Business</p>
                            <p className="text-xs text-gray-400">Just now</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {generatedPost.versions[activeVersionIndex].content}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {generatedPost.versions[activeVersionIndex].hashtags.map(tag => {
                            const hashTag = tag.startsWith('#') ? tag : `#${tag}`
                            return (
                              <span
                                key={tag}
                                className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full border', cfg.tagColor)}
                              >
                                {hashTag}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const post = generatedPost.versions[activeVersionIndex]
                        const tagsStr = post.hashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ')
                        copyToClipboard(`${post.content}\n\n${tagsStr}`)
                      }}
                      className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm font-bold"
                    >
                      <Copy size={14} /> Copy
                    </button>
                    <button className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm font-bold">
                      <Calendar size={14} /> Schedule
                    </button>
                    <button
                      className={clsx('flex-1 flex items-center justify-center gap-2 text-sm rounded-lg px-4 py-2 text-white font-bold bg-gradient-to-r shadow-sm transition', cfg.headerGradient)}
                    >
                      <Send size={14} /> Publish
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-fuchsia-100 via-pink-100 to-amber-100 flex items-center justify-center mb-3">
                    <Megaphone size={26} className="text-pink-500" />
                  </div>
                  <p className="text-sm">Your AI-generated post will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Posts tab */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {MOCK_POSTS.map(post => {
            const pc = PLATFORM_CONFIG[post.platform]
            const PIcon = pc.icon
            return (
              <div key={post.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <PIcon size={16} className={pc.color} />
                    <span className="text-sm font-medium text-gray-700">{pc.label}</span>
                    <span className={clsx('badge',
                      post.status === 'published' ? 'badge-green' :
                      post.status === 'scheduled' ? 'badge-blue' :
                      'bg-gray-100 text-gray-600 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
                    )}>
                      {post.status}
                    </span>
                  </div>
                  {post.publishedAt && (
                    <p className="text-xs text-gray-400">{format(post.publishedAt, 'dd MMM yyyy')}</p>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-3">{post.content}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {post.hashtags.map(tag => (
                    <span key={tag} className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full border', pc.tagColor)}>{tag}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Festivals tab */}
      {activeTab === 'festivals' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Plan your marketing calendar around major Indian festivals
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FESTIVALS.map(f => (
              <div
                key={f.name}
                className="card-hover text-center py-6"
                onClick={() => {
                  setFestival(f.name)
                  setActiveTab('create')
                }}
              >
                <div className="text-4xl mb-2">{f.emoji}</div>
                <p className="font-semibold text-gray-900 text-sm">{f.name}</p>
                <p className="text-xs text-gray-500">{f.date}</p>
                <button className="mt-3 text-xs text-brand-600 font-medium">Create post →</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}