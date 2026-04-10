import { LoginForm } from '@/components/login-form'
import { Building2 } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 rounded-2xl p-3 mb-4 shadow-lg">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Hausverwaltung</h1>
          <p className="text-slate-400 text-sm mt-1">Rechnungsworkflow</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-1">Willkommen zurück</h2>
          <p className="text-slate-500 text-sm mb-6">Bitte melden Sie sich an, um fortzufahren.</p>
          <LoginForm />
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © 2026 Hausverwaltung Rechnungsworkflow
        </p>
      </div>
    </div>
  )
}
