import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  MessageSquare,
  PanelRight,
  Send,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { BrandMark } from '@/components/layout/BrandMark'
import { TypingIndicator } from '@/components/workspace/TypingIndicator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { api, DocumentTextResponse, SourceCitation, SummaryResponse } from '@/services/api'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceCitation[]
}

const starterQuestions = [
  'What is the main idea of this document?',
  'List the most important concepts with page references.',
  'What decisions or recommendations does the document make?',
]

function formatAnswer(content: string) {
  return content.split('\n').map((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return <div key={index} className="h-3" />
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <p key={index} className="pl-4 text-white/70">
          <span className="mr-2 text-white/35">-</span>
          {trimmed.slice(2)}
        </p>
      )
    }
    return (
      <p key={index} className="text-white/76">
        {trimmed}
      </p>
    )
  })
}

function CitationList({ sources }: { sources?: SourceCitation[] }) {
  if (!sources?.length) return null

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {sources.map((source, index) => (
        <Badge key={`${source.page_number}-${index}`} className="max-w-full text-white/50">
          <BookOpen className="h-3 w-3" />
          Page {source.page_number}
          {source.chunk_index !== undefined ? ` · Chunk ${source.chunk_index + 1}` : ''}
        </Badge>
      ))}
    </div>
  )
}

export default function WorkspacePage() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const [documentText, setDocumentText] = useState<DocumentTextResponse | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingDocument, setLoadingDocument] = useState(true)
  const [asking, setAsking] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const activePageText = useMemo(() => {
    return documentText?.pages.find((page) => page.page_number === currentPage)?.text || ''
  }, [currentPage, documentText])

  const pageCount = documentText?.page_count || 1

  useEffect(() => {
    let objectUrl: string | null = null

    async function loadDocument() {
      if (!documentId) return

      setLoadingDocument(true)
      setError(null)
      try {
        const [text, fileUrl] = await Promise.all([
          api.getDocumentText(documentId),
          api.getDocumentFileUrl(documentId),
        ])
        objectUrl = fileUrl
        setDocumentText(text)
        setPdfUrl(fileUrl)
        setCurrentPage(1)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to load this document')
      } finally {
        setLoadingDocument(false)
      }
    }

    loadDocument()

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [documentId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, asking])

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), pageCount))
  }, [pageCount])

  const askQuestion = useCallback(async (overrideQuestion?: string) => {
    if (!documentId) return
    const cleanQuestion = (overrideQuestion || question).trim()
    if (!cleanQuestion || asking) return

    setQuestion('')
    setAsking(true)
    setError(null)

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: cleanQuestion,
    }
    const assistantId = crypto.randomUUID()

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: 'assistant', content: '' },
    ])

    try {
      const response = await api.streamChat(documentId, cleanQuestion, (token) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? { ...message, content: message.content + token }
              : message,
          ),
        )
      })

      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? { ...message, content: response.answer, sources: response.sources }
            : message,
        ),
      )

      const firstSource = response.sources?.[0]
      if (firstSource) goToPage(firstSource.page_number)
    } catch (err: unknown) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: err instanceof Error ? err.message : 'I could not generate an answer right now.',
                sources: [],
              }
            : message,
        ),
      )
    } finally {
      setAsking(false)
    }
  }, [asking, documentId, goToPage, question])

  const generateSummary = async () => {
    if (!documentId || summaryLoading) return

    setSummaryLoading(true)
    setError(null)
    try {
      const result = await api.getSummary(documentId)
      setSummary(result)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Summary\n\n${result.summary}\n\nKey takeaways\n${result.key_takeaways.map((item) => `- ${item}`).join('\n')}`,
        },
      ])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to generate a summary')
    } finally {
      setSummaryLoading(false)
    }
  }

  if (loadingDocument) {
    return (
      <div className="min-h-screen bg-black text-white grid place-items-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white/35" />
          <p className="text-sm text-white/35">Preparing your workspace</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mesh-bg" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} aria-label="Back to dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <BrandMark className="hidden sm:flex" />
          </div>

          <div className="min-w-0 flex-1 px-4 text-center">
            <p className="truncate text-sm font-medium text-white/80">{documentText?.filename || 'Document'}</p>
            <p className="text-xs text-white/25">{pageCount} pages indexed for retrieval</p>
          </div>

          <Button variant="secondary" onClick={generateSummary} disabled={summaryLoading}>
            {summaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            <span className="hidden sm:inline">Generate Summary</span>
          </Button>
        </header>

        <main className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] lg:p-6">
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="min-h-[620px]"
          >
            <Card className="flex h-full min-h-[620px] flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-white/40" />
                  <span className="text-sm font-medium text-white/65">PDF Viewer</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-24 text-center text-xs text-white/45">
                    Page {currentPage} of {pageCount}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pageCount}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-h-[520px] bg-white/[0.018]">
                  {pdfUrl ? (
                    <iframe
                      key={`${pdfUrl}-${currentPage}`}
                      src={`${pdfUrl}#page=${currentPage}&toolbar=0&navpanes=0`}
                      title={documentText?.filename || 'PDF preview'}
                      className="h-full min-h-[520px] w-full border-0"
                    />
                  ) : (
                    <div className="grid h-full place-items-center p-8 text-center">
                      <p className="text-sm text-white/35">PDF preview is unavailable.</p>
                    </div>
                  )}
                </div>

                <aside className="hidden border-l border-white/[0.06] bg-black/20 p-4 xl:block">
                  <div className="mb-3 flex items-center gap-2">
                    <PanelRight className="h-4 w-4 text-white/35" />
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/30">Page Text</p>
                  </div>
                  <div className="max-h-[545px] overflow-auto rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                    <p className="whitespace-pre-wrap text-xs leading-6 text-white/45">
                      {activePageText || 'No extractable text was found on this page.'}
                    </p>
                  </div>
                </aside>
              </div>
            </Card>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
          >
            <Card className="flex h-[calc(100vh-120px)] min-h-[620px] flex-col overflow-hidden">
              <div className="border-b border-white/[0.06] px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-white/45" />
                      <h1 className="text-sm font-semibold text-white/80">Document Chat</h1>
                    </div>
                    <p className="mt-1 text-xs text-white/28">Answers are grounded in retrieved PDF chunks.</p>
                  </div>
                  <Badge>
                    <Sparkles className="h-3 w-3" />
                    RAG
                  </Badge>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <AnimatePresence initial={false}>
                  {messages.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex h-full min-h-[410px] flex-col justify-center"
                    >
                      <div className="mx-auto max-w-md text-center">
                        <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.05]">
                          <Sparkles className="h-6 w-6 text-white/55" />
                        </div>
                        <h2 className="text-2xl font-semibold tracking-tight text-white">Ask from the source.</h2>
                        <p className="mt-3 text-sm leading-6 text-white/35">
                          Lumina retrieves the most relevant chunks first, then asks Gemini to answer only from that context.
                        </p>
                        <div className="mt-8 grid gap-2">
                          {starterQuestions.map((item) => (
                            <button
                              key={item}
                              onClick={() => askQuestion(item)}
                              className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-left text-sm text-white/55 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white/80"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-5">
                      {messages.map((message) => (
                        <motion.article
                          key={message.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                        >
                          <div
                            className={
                              message.role === 'user'
                                ? 'max-w-[85%] rounded-3xl bg-white px-5 py-4 text-sm leading-6 text-black'
                                : 'max-w-[92%] rounded-3xl border border-white/[0.07] bg-white/[0.035] px-5 py-4 text-sm leading-7'
                            }
                          >
                            {message.content ? (
                              <div className="space-y-1.5">{formatAnswer(message.content)}</div>
                            ) : (
                              <TypingIndicator />
                            )}
                            <CitationList sources={message.sources} />
                          </div>
                        </motion.article>
                      ))}
                      {asking && messages[messages.length - 1]?.content && (
                        <div className="flex justify-start">
                          <TypingIndicator />
                        </div>
                      )}
                    </div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-white/[0.06] p-4">
                {summary && (
                  <div className="mb-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/25">Latest Summary</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/45">{summary.summary}</p>
                  </div>
                )}

                {error && (
                  <div className="mb-3 rounded-2xl border border-red-400/10 bg-red-400/5 px-4 py-3 text-sm text-red-300/80">
                    {error}
                  </div>
                )}

                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    askQuestion()
                  }}
                  className="flex items-end gap-3"
                >
                  <Textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        askQuestion()
                      }
                    }}
                    placeholder="Ask a question about this PDF..."
                    className="min-h-14 flex-1 rounded-2xl py-4"
                    rows={1}
                  />
                  <Button size="icon" type="submit" disabled={!question.trim() || asking} aria-label="Send question">
                    {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </Card>
          </motion.section>
        </main>
      </div>
    </div>
  )
}
