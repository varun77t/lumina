import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Sparkles, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const { signIn, signUp, configError } = useAuth()
  const navigate = useNavigate()
  const displayError = error || configError

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        } else {
          navigate('/dashboard')
        }
      } else {
        const { error, needsConfirmation } = await signUp(email, password)
        if (error) {
          setError(error.message)
        } else if (needsConfirmation) {
          setIsLogin(true)
          setSuccess('Check your email to confirm your account, then sign in.')
        } else {
          navigate('/dashboard')
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden px-4">
      {/* Spotlight effects */}
      <div className="spotlight" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(255,255,255,0.03) 0%, transparent 60%)'
        }}
      />

      {/* Subtle grid pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Back to home */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors duration-300 z-10"
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium">Lumina AI</span>
      </motion.button>

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-card p-10 md:p-12 glow-sm">
          {/* Header */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/10"
            >
              <Sparkles className="w-6 h-6 text-white/60" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-sm text-white/30">
              {isLogin
                ? 'Sign in to access your documents'
                : 'Start transforming your documents'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider" htmlFor="email-input">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 pl-11 text-sm text-white placeholder-white/20 focus:border-white/20 focus:bg-white/[0.06] transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider" htmlFor="password-input">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={6}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 pl-11 text-sm text-white placeholder-white/20 focus:border-white/20 focus:bg-white/[0.06] transition-all duration-300"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {displayError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 text-red-400/80 text-sm bg-red-400/5 border border-red-400/10 rounded-xl px-4 py-3"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {displayError}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-white/75 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3"
                >
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || Boolean(configError)}
              className="group w-full flex items-center justify-center gap-2 bg-white text-black py-3.5 rounded-xl font-medium text-sm hover:bg-white/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign in' : 'Create account'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError(null)
                setSuccess(null)
              }}
              className="text-sm text-white/30 hover:text-white/60 transition-colors duration-300"
            >
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <span className="text-white/60 font-medium">
                {isLogin ? 'Sign up' : 'Sign in'}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
