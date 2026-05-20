import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import AuthPage from '@/pages/AuthPage'
import DashboardPage from '@/pages/DashboardPage'
import LandingPage from '@/pages/LandingPage'
import WorkspacePage from '@/pages/WorkspacePage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, devMode } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white grid place-items-center">
        <div className="h-8 w-8 rounded-full border border-white/10 border-t-white/70 animate-spin" />
      </div>
    )
  }

  if (!user && !devMode) {
    return <Navigate to="/auth" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:documentId"
        element={
          <ProtectedRoute>
            <WorkspacePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}
