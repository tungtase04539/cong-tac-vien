import Parser from 'rss-parser'

const parser = new Parser()

export interface FeedArticle {
  title: string
  author: string
  url: string
  guid: string
  content: string
  summary: string
  published_at: string
  cover_image: string | null
}

export async function fetchFeed(feedUrl: string, authCode?: string): Promise<FeedArticle[]> {
  const headers: Record<string, string> = {}
  if (authCode) headers.Authorization = `Bearer ${authCode}`

  const jsonUrl = feedUrl.replace(/\.(rss|atom)$/, '.json')
  try {
    const res = await fetch(jsonUrl, { headers })
    if (res.ok) {
      const data = await res.json()
      const items = data.items || data.entries || []
      return items.map((item: Record<string, unknown>) => ({
        title: (item.title as string) || '',
        author: (item.author as string) || (item.creator as string) || '',
        url: (item.url as string) || (item.link as string) || '',
        guid: (item.id as string) || (item.guid as string) || (item.url as string) || '',
        content: (item.content_html as string) || (item.content as string) || (item.description as string) || '',
        summary: ((item.summary as string) || (item.description as string) || '').slice(0, 200),
        published_at: (item.date_published as string) || (item.pubDate as string) || new Date().toISOString(),
        cover_image: (item.image as string) || null,
      }))
    }
  } catch { /* fall through */ }

  const feed = await parser.parseURL(feedUrl)
  return (feed.items || []).map((item) => ({
    title: item.title || '',
    author: item.creator || item.author || '',
    url: item.link || '',
    guid: item.guid || item.link || '',
    content: item['content:encoded'] || item.content || item.contentSnippet || '',
    summary: (item.contentSnippet || '').slice(0, 200),
    published_at: item.isoDate || item.pubDate || new Date().toISOString(),
    cover_image: null,
  }))
}

export function countWords(text: string): number {
  const plainText = text.replace(/<[^>]*>/g, '').trim()
  const cjk = plainText.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g)?.length || 0
  const words = plainText.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ').split(/\s+/).filter(Boolean).length
  return cjk + words
}
