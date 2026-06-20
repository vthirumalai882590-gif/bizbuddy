import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

const BUSINESS_TYPES = [
  'Retail / General Store', 'Restaurant / Food Stall', 'Salon / Beauty',
  'Tailoring / Boutique', 'Electronics / Repair', 'Wholesale / Trading',
  'Services', 'Other',
]

const LANGUAGES: { code: 'en' | 'hi' | 'ta' | 'te' | 'mr' | 'bn' | 'gu'; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'mr', label: 'मराठी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'gu', label: 'ગુજરાતી' },
]

export default function OnboardingPage() {
  const { updateUserProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0])
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [language, setLanguage] = useState<typeof LANGUAGES[number]['code']>('en')

  const finish = async () => {
    setSubmitting(true)
    try {
      await updateUserProfile({ businessName, businessType, city, phone, language })
      toast.success('Profile set up!')
      navigate('/dashboard')
    } catch {
      toast.error('Could not save your profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md card">
        {/* Progress */}
        <div className="flex gap-1.5 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-brand-500' : 'bg-gray-100'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Tell us about your business</h1>
              <p className="text-sm text-gray-500 mt-1">This helps us personalize your dashboard</p>
            </div>
            <div>
              <label className="label">Business name</label>
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="input" placeholder="e.g. Sharma General Store" />
            </div>
            <div>
              <label className="label">Business type</label>
              <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="input">
                {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!businessName}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Continue <ArrowRight size={15} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Where are you based?</h1>
              <p className="text-sm text-gray-500 mt-1">We'll surface relevant loan schemes and festivals for your area</p>
            </div>
            <div>
              <label className="label">City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className="input" placeholder="e.g. Chennai" />
            </div>
            <div>
              <label className="label">Phone number</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+91 98765 43210" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
              <button onClick={() => setStep(3)} disabled={!city} className="btn-primary flex-1 flex items-center justify-center gap-2">
                Continue <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Choose your language</h1>
              <p className="text-sm text-gray-500 mt-1">You can change this later in Settings</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    language === l.code ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
              <button onClick={finish} disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                Finish setup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}