import { lazy, Suspense } from 'react'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import LandingPage from '@/pages/LandingPage'

// Load the app pages on demand so the landing page doesn't download the workspace code
const AuthPage = lazy(() => import('@/pages/AuthPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const WorkspacePage = lazy(() => import('@/pages/WorkspacePage'))

function PageLoader() {
  return (
    <div className="min-h-screen bg-black text-white grid place-items-center">
      <div className="h-8 w-8 rounded-full border border-white/10 border-t-white/70 animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, devMode } = useAuth()

  if (loading) {
    return <PageLoader />
  }

  if (!user && !devMode) {
    return <Navigate to="/auth" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
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
    </Suspense>
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
