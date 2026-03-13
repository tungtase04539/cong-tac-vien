import type { LarkPublisherSettings } from '@/types'

const LARK_API_BASE = 'https://open.feishu.cn/open-apis'

interface LarkTokenResponse {
  code: number
  msg: string
  tenant_access_token: string
  expire: number
}

interface LarkDocResponse {
  code: number
  msg: string
  data?: {
    document?: {
      document_id: string
      title: string
    }
  }
}

interface LarkBlock {
  block_type: number
  text?: {
    elements: Array<{
      text_run: {
        content: string
        text_element_style?: Record<string, unknown>
      }
    }>
    style?: Record<string, unknown>
  }
  heading1?: { elements: Array<{ text_run: { content: string } }> }
  heading2?: { elements: Array<{ text_run: { content: string } }> }
  heading3?: { elements: Array<{ text_run: { content: string } }> }
  code?: {
    elements: Array<{ text_run: { content: string } }>
    style?: { language?: number }
  }
  quote?: { elements: Array<{ text_run: { content: string } }> }
}

// Lark block type IDs
const BLOCK_TYPE = {
  PAGE: 1,
  TEXT: 2,
  HEADING1: 3,
  HEADING2: 4,
  HEADING3: 5,
  CODE: 14,
  QUOTE: 15,
  BULLET: 12,
  ORDERED: 13,
} as const

export async function getLarkToken(settings: LarkPublisherSettings): Promise<string> {
  const { lark_app_id, lark_app_secret } = settings
  if (!lark_app_id || !lark_app_secret) {
    throw new Error('Lark App ID and App Secret are required. Please configure them in Settings.')
  }

  const res = await fetch(`${LARK_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: lark_app_id,
      app_secret: lark_app_secret,
    }),
  })

  if (!res.ok) {
    throw new Error(`Failed to get Lark access token: ${res.statusText}`)
  }

  const data = (await res.json()) as LarkTokenResponse
  if (data.code !== 0) {
    throw new Error(`Lark auth error: ${data.msg}`)
  }

  return data.tenant_access_token
}

export async function createDocument(
  token: string,
  title: string,
  spaceId: string,
): Promise<{ documentId: string }> {
  const res = await fetch(`${LARK_API_BASE}/docx/v1/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      folder_token: spaceId,
    }),
  })

  if (!res.ok) {
    throw new Error(`Failed to create Lark document: ${res.statusText}`)
  }

  const data = (await res.json()) as LarkDocResponse
  if (data.code !== 0) {
    throw new Error(`Lark create doc error: ${data.msg}`)
  }

  const documentId = data.data?.document?.document_id
  if (!documentId) {
    throw new Error('No document ID returned from Lark API')
  }

  return { documentId }
}

function markdownToBlocks(markdown: string): LarkBlock[] {
  const lines = markdown.split('\n')
  const blocks: LarkBlock[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code blocks
    if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      blocks.push({
        block_type: BLOCK_TYPE.CODE,
        code: {
          elements: [{ text_run: { content: codeLines.join('\n') } }],
          style: { language: 1 }, // 1 = plain text
        },
      })
      continue
    }

    // Headings
    if (line.startsWith('### ')) {
      blocks.push({
        block_type: BLOCK_TYPE.HEADING3,
        heading3: { elements: [{ text_run: { content: line.slice(4).trim() } }] },
      })
      continue
    }
    if (line.startsWith('## ')) {
      blocks.push({
        block_type: BLOCK_TYPE.HEADING2,
        heading2: { elements: [{ text_run: { content: line.slice(3).trim() } }] },
      })
      continue
    }
    if (line.startsWith('# ')) {
      blocks.push({
        block_type: BLOCK_TYPE.HEADING1,
        heading1: { elements: [{ text_run: { content: line.slice(2).trim() } }] },
      })
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      blocks.push({
        block_type: BLOCK_TYPE.QUOTE,
        quote: { elements: [{ text_run: { content: line.slice(2).trim() } }] },
      })
      continue
    }

    // Bullet list
    if (line.match(/^[-*+] /)) {
      blocks.push({
        block_type: BLOCK_TYPE.BULLET,
        text: {
          elements: [{ text_run: { content: line.slice(2).trim() } }],
        },
      })
      continue
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      const content = line.replace(/^\d+\.\s+/, '')
      blocks.push({
        block_type: BLOCK_TYPE.ORDERED,
        text: {
          elements: [{ text_run: { content: content.trim() } }],
        },
      })
      continue
    }

    // Horizontal rule or empty line — use empty text block
    if (line.trim() === '' || line.trim() === '---' || line.trim() === '***') {
      blocks.push({
        block_type: BLOCK_TYPE.TEXT,
        text: { elements: [{ text_run: { content: '' } }] },
      })
      continue
    }

    // Regular paragraph
    // Strip basic markdown inline formatting for plain text blocks
    const plainText = line
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')

    blocks.push({
      block_type: BLOCK_TYPE.TEXT,
      text: { elements: [{ text_run: { content: plainText } }] },
    })
  }

  return blocks.filter((b) => b !== null)
}

export async function createBlock(
  token: string,
  documentId: string,
  blocks: LarkBlock[],
): Promise<void> {
  if (blocks.length === 0) return

  // Lark API accepts up to 50 blocks per request
  const CHUNK_SIZE = 50
  for (let i = 0; i < blocks.length; i += CHUNK_SIZE) {
    const chunk = blocks.slice(i, i + CHUNK_SIZE)
    const res = await fetch(
      `${LARK_API_BASE}/docx/v1/documents/${documentId}/blocks/${documentId}/children`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          children: chunk,
          index: i,
        }),
      },
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const msg = (err as { msg?: string }).msg ?? res.statusText
      throw new Error(`Failed to create blocks: ${msg}`)
    }

    const data = (await res.json()) as { code: number; msg: string }
    if (data.code !== 0) {
      throw new Error(`Lark block error: ${data.msg}`)
    }
  }
}

export async function publishToLark(
  content: string,
  title: string,
  settings: LarkPublisherSettings,
): Promise<{ docUrl: string }> {
  if (!settings.lark_space_id) {
    throw new Error('Lark Wiki Space ID is required. Please configure it in Settings.')
  }

  const token = await getLarkToken(settings)
  const { documentId } = await createDocument(token, title || 'Untitled', settings.lark_space_id)
  const blocks = markdownToBlocks(content)
  await createBlock(token, documentId, blocks)

  const docUrl = `https://bytedance.feishu.cn/docx/${documentId}`
  return { docUrl }
}
