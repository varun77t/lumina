import { supabase } from '@/lib/supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const devMode = import.meta.env.VITE_SUPABASE_URL === undefined || 
                  import.meta.env.VITE_SUPABASE_ANON_KEY === undefined ||
                  import.meta.env.VITE_BYPASS_AUTH === 'true'

  if (devMode) {
    const savedUser = localStorage.getItem('lumina_mock_user')
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        const payload = { sub: user.id || 'dev-user-id', email: user.email }
        const base64Payload = btoa(JSON.stringify(payload)).replace(/=/g, '')
        const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${base64Payload}.c2lnbmF0dXJl`
        return {
          'Authorization': `Bearer ${token}`,
        }
      } catch (e) {
        console.error('Failed to parse mock user', e)
      }
    }
    return {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXYtdXNlci1pZCIsImVtYWlsIjoiZGV2QGx1bWluYS5haSJ9.c2lnbmF0dXJl',
    }
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    return {
      'Authorization': `Bearer ${session.access_token}`,
    }
  }
  return {}
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
    const headers = await getAuthHeaders()
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(error.detail || 'Upload failed')
    }

    return res.json()
  },

  async getDocuments(): Promise<{ documents: Document[] }> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE}/documents`, { headers })

    if (!res.ok) throw new Error('Failed to fetch documents')
    return res.json()
  },

  async deleteDocument(documentId: string): Promise<void> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE}/documents/${documentId}`, {
      method: 'DELETE',
      headers,
    })

    if (!res.ok) throw new Error('Failed to delete document')
  },

  async getDocumentText(documentId: string): Promise<DocumentTextResponse> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE}/documents/${documentId}/text`, { headers })

    if (!res.ok) throw new Error('Failed to fetch document text')
    return res.json()
  },

  async getDocumentFileUrl(documentId: string): Promise<string> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE}/documents/${documentId}/file`, { headers })

    if (!res.ok) throw new Error('Failed to fetch PDF')
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  },

  async chat(documentId: string, question: string): Promise<ChatResponse> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ document_id: documentId, question }),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Chat failed' }))
      throw new Error(error.detail || 'Chat failed')
    }

    return res.json()
  },

  async streamChat(
    documentId: string,
    question: string,
    onToken: (token: string) => void,
  ): Promise<ChatResponse> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ document_id: documentId, question }),
    })

    if (!res.ok || !res.body) {
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
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE}/summary`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ document_id: documentId }),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Summary failed' }))
      throw new Error(error.detail || 'Summary failed')
    }

    return res.json()
  },
}
