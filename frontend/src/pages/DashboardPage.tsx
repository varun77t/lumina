import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { api, Document } from '@/services/api'
import {
  FileText, Upload, MessageSquare, Sparkles, LogOut,
  Plus, Clock, Trash2, ArrowRight, File, Loader2, X
} from 'lucide-react'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' }
  })
}

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      const data = await api.getDocuments()
      setDocuments(data.documents)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDocuments()
  }, [fetchDocuments])

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are allowed')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const doc = await api.uploadPdf(file)
      setDocuments(prev => [doc, ...prev])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  const handleDelete = async (docId: string) => {
    try {
      await api.deleteDocument(docId)
      setDocuments(prev => prev.filter(d => d.id !== docId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mesh-bg" />

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/5"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10">
            <Sparkles className="w-4 h-4 text-white/80" />
          </div>
          <span className="text-base font-semibold tracking-tight">Lumina AI</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/30 hidden md:block">{user?.email || 'Local workspace'}</span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors duration-300 px-3 py-2 rounded-lg hover:bg-white/5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </motion.nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 py-12">
        {/* Header */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            <span className="text-gradient">Your Library</span>
          </h1>
          <p className="text-white/30 text-sm">Upload documents and start conversations with your knowledge.</p>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
        >
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <FileText className="w-4 h-4 text-white/40" />
              </div>
              <span className="text-xs text-white/30 uppercase tracking-wider font-medium">Documents</span>
            </div>
            <span className="text-2xl font-bold">{documents.length}</span>
          </div>
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white/40" />
              </div>
              <span className="text-xs text-white/30 uppercase tracking-wider font-medium">Ready to Chat</span>
            </div>
            <span className="text-2xl font-bold">{documents.length}</span>
          </div>
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <Clock className="w-4 h-4 text-white/40" />
              </div>
              <span className="text-xs text-white/30 uppercase tracking-wider font-medium">Recent</span>
            </div>
            <span className="text-2xl font-bold">{documents.length > 0 ? formatDate(documents[0]?.uploaded_at) : '-'}</span>
          </div>
        </motion.div>

        {/* Upload Area */}
        <motion.div
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-12"
        >
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`glass-card p-12 text-center transition-all duration-300 cursor-pointer ${
              dragActive ? 'border-white/20 bg-white/[0.06]' : ''
            } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileInput}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
                <p className="text-sm text-white/40">Processing your document...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                  <Plus className="w-6 h-6 text-white/40" />
                </div>
                <div>
                  <p className="text-sm text-white/60 font-medium mb-1">
                    Drop a PDF here or click to upload
                  </p>
                  <p className="text-xs text-white/25">
                    Your document will be processed and ready for AI conversation
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12"
        >
          <div className="glass-card p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                <Upload className="w-4 h-4 text-white/40" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white/80">Quick Actions</h2>
                <p className="text-xs text-white/28">Add a document or continue a workspace.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => document.getElementById('file-upload')?.click()}
                className="bg-white text-black px-5 py-2.5 rounded-xl text-xs font-medium hover:bg-white/90 transition-all duration-300"
              >
                Upload PDF
              </button>
              <button
                disabled={documents.length === 0}
                onClick={() => documents[0] && navigate(`/workspace/${documents[0].id}`)}
                className="bg-white/[0.04] border border-white/[0.08] text-white/60 px-5 py-2.5 rounded-xl text-xs font-medium hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
              >
                Open Chat Workspace
              </button>
            </div>
          </div>

          <div className="glass-card p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                <MessageSquare className="w-4 h-4 text-white/40" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white/80">Recent Chats</h2>
                <p className="text-xs text-white/28">Recent document workspaces appear here.</p>
              </div>
            </div>
            <div className="space-y-2">
              {documents.slice(0, 2).map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => navigate(`/workspace/${doc.id}`)}
                  className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-left hover:bg-white/[0.05] transition-all duration-300"
                >
                  <span className="truncate text-xs text-white/55">{doc.filename}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white/25" />
                </button>
              ))}
              {documents.length === 0 && (
                <p className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-xs text-white/25">
                  Upload your first PDF to begin.
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-center justify-between bg-red-400/5 border border-red-400/10 rounded-xl px-5 py-3"
            >
              <span className="text-sm text-red-400/80">{error}</span>
              <button onClick={() => setError(null)}>
                <X className="w-4 h-4 text-red-400/50 hover:text-red-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Documents Grid */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white/80">Your Documents</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <File className="w-10 h-10 text-white/10 mx-auto mb-4" />
              <p className="text-sm text-white/30 mb-1">No documents yet</p>
              <p className="text-xs text-white/15">Upload a PDF to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {documents.map((doc, i) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card-hover p-6 group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                        <FileText className="w-5 h-5 text-white/30" />
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(doc.id) }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/5 transition-all duration-300"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white/20 hover:text-red-400/60" />
                      </button>
                    </div>

                    <h3 className="text-sm font-medium text-white/80 mb-1 truncate">{doc.filename}</h3>
                    <p className="text-xs text-white/25 mb-5">
                      {doc.page_count} pages / {formatDate(doc.uploaded_at)}
                    </p>

                    <button
                      onClick={() => navigate(`/workspace/${doc.id}`)}
                      className="w-full flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl py-2.5 text-xs text-white/50 hover:text-white/80 transition-all duration-300 font-medium"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Open Chat
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
