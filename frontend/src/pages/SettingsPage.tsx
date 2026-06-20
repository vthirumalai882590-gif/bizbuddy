import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import { Loader2, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const LANGUAGES: { code: 'en' | 'hi' | 'ta' | 'te' | 'mr' | 'bn' | 'gu'; label: string }[] = [
  { code: 'en', label: 'English' }, { code: 'hi', label: 'हिन्दी' }, { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' }, { code: 'mr', label: 'मराठी' }, { code: 'bn', label: 'বাংলা' }, { code: 'gu', label: 'ગુજરાતી' },
]

export default function SettingsPage() {
  const { user, updateUserProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [businessName, setBusinessName] = useState(user?.businessName ?? '')
  const [businessType, setBusinessType] = useState(user?.businessType ?? '')
  const [city, setCity] = useState(user?.city ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [language, setLanguage] = useState(user?.language ?? 'en')

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateUserProfile({ displayName, businessName, businessType, city, phone, language })
      toast.success('Settings saved')
    } catch {
      toast.error('Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="section-title">Settings</h1>
        <p className="section-subtitle">Manage your profile and business details</p>
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-900">Profile</h3>
        <div className="flex items-center gap-4">
          {user?.photoURL ? (
            <img src={user.photoURL} className="w-14 h-14 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-lg font-bold text-brand-700">{displayName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{user?.email}</p>
            <span className="badge badge-green capitalize mt-1">{user?.plan ?? 'free'} plan</span>
          </div>
        </div>
        <div>
          <label className="label">Display name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input" />
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-900">Business Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Business name</label>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Business type</label>
            <input value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-900">Language</h3>
        <div className="grid grid-cols-4 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                language === l.code ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={handleLogout} className="btn-secondary flex items-center gap-2 text-red-600">
          <LogOut size={15} /> Sign out
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving && <Loader2 size={15} className="animate-spin" />}
          Save Changes
        </button>
      </div>
    </div>
  )
}