import { bypassAuth, supabase } from '@/lib/supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

// Unsigned token for local development; the backend only accepts it when AUTH_BYPASS=true
function mockToken(): string {
  let payload = { sub: 'dev-user-id', email: 'dev@lumina.ai' }
  const savedUser = localStorage.getItem('lumina_mock_user')
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser)
      payload = { sub: user.id || payload.sub, email: user.email || payload.email }
    } catch (e) {
      console.error('Failed to parse mock user', e)
    }
  }
  const base64Payload = btoa(JSON.stringify(payload)).replace(/=/g, '')
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${base64Payload}.c2lnbmF0dXJl`
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (bypassAuth) {
    return { Authorization: `Bearer ${mockToken()}` }
  }

  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null)
  const detail = body?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg
  return fallback
}

async function request(path: string, init: RequestInit, fallbackError: string): Promise<Response> {
  const headers = { ...(await getAuthHeaders()), ...(init.headers as Record<string, string> | undefined) }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    throw new Error(await errorMessage(res, fallbackError))
  }
  return res
}

function postJson(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export interface Document {
  id: string
  filename: string
  page_count: number
  uploaded_at: string
  user_id: string
}

export interface SourceCitation {
  page_number: number
  chunk_text: string
  relevance_score: number
  chunk_index?: number
}

export interface ChatResponse {
  answer: string
  sources: SourceCitation[]
  document_name: string
}

export interface SummaryResponse {
  summary: string
  key_takeaways: string[]
  document_name: string
  page_count: number
}

export interface PageContent {
  page_number: number
  text: string
}

export interface DocumentTextResponse {
  document_id: string
  filename: string
  pages: PageContent[]
  page_count: number
}

export const api = {
  async uploadPdf(file: File): Promise<Document> {
    const formData = new FormData()
    formData.append('file', file)

    const res = await request('/upload', { method: 'POST', body: formData }, 'Upload failed')
    return res.json()
  },

  async getDocuments(): Promise<{ documents: Document[] }> {
    const res = await request('/documents', {}, 'Failed to fetch documents')
    return res.json()
  },

  async deleteDocument(documentId: string): Promise<void> {
    await request(`/documents/${documentId}`, { method: 'DELETE' }, 'Failed to delete document')
  },

  async getDocumentText(documentId: string): Promise<DocumentTextResponse> {
    const res = await request(`/documents/${documentId}/text`, {}, 'Failed to fetch document text')
    return res.json()
  },

  async getDocumentFileUrl(documentId: string): Promise<string> {
    const res = await request(`/documents/${documentId}/file`, {}, 'Failed to fetch PDF')
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  },

  async chat(documentId: string, question: string): Promise<ChatResponse> {
    const res = await request('/chat', postJson({ document_id: documentId, question }), 'Chat failed')
    return res.json()
  },

  async streamChat(
    documentId: string,
    question: string,
    onToken: (token: string) => void,
  ): Promise<ChatResponse> {
    const res = await request('/chat/stream', postJson({ document_id: documentId, question }), 'Chat failed')

    if (!res.body) {
      return this.chat(documentId, question)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finalResponse: ChatResponse | null = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() || ''

      for (const event of events) {
        const dataLine = event.split('\n').find((line) => line.startsWith('data: '))
        if (!dataLine) continue

        const payload = JSON.parse(dataLine.slice(6))
        if (payload.type === 'token') {
          onToken(payload.content)
        }
        if (payload.type === 'final') {
          finalResponse = payload.response
        }
      }
    }

    if (!finalResponse) {
      throw new Error('Streaming response ended unexpectedly')
    }

    return finalResponse
  },

  async getSummary(documentId: string): Promise<SummaryResponse> {
    const res = await request('/summary', postJson({ document_id: documentId }), 'Summary failed')
    return res.json()
  },
}
