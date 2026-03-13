import type { LarkPublisherSettings } from '@/types'

const TRANSLATE_SYSTEM_PROMPT = `You are a professional translator and editor.
Translate the following Markdown content to Vietnamese.
Preserve all Markdown formatting, code blocks, and technical terms exactly as-is.
Only translate natural language text — do not translate code, URLs, variable names, or technical identifiers.
Return only the translated Markdown content, with no extra commentary.`

export async function translateContent(
  content: string,
  title: string,
  settings: LarkPublisherSettings,
): Promise<string> {
  const provider = settings.ai_provider ?? 'gemini'
  const apiKey = settings.ai_api_key
  if (!apiKey) throw new Error('AI API key not configured. Please add your API key in Settings.')

  const userMessage = title
    ? `Title: ${title}\n\n${content}`
    : content

  switch (provider) {
    case 'gemini':
      return translateWithGemini(userMessage, apiKey, settings.ai_model)
    case 'openai':
      return translateWithOpenAI(userMessage, apiKey, settings.ai_model)
    case 'anthropic':
      return translateWithAnthropic(userMessage, apiKey, settings.ai_model)
    default:
      throw new Error(`Unsupported AI provider: ${provider}`)
  }
}

async function translateWithGemini(
  content: string,
  apiKey: string,
  model?: string,
): Promise<string> {
  const modelId = model || 'gemini-1.5-pro'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: TRANSLATE_SYSTEM_PROMPT + '\n\n---\n\n' + content },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Gemini API error: ${(err as { error?: { message?: string } }).error?.message ?? res.statusText}`)
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response from Gemini API')
  return text
}

async function translateWithOpenAI(
  content: string,
  apiKey: string,
  model?: string,
): Promise<string> {
  const modelId = model || 'gpt-4o'
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: TRANSLATE_SYSTEM_PROMPT },
        { role: 'user', content },
      ],
      temperature: 0.3,
      max_tokens: 8192,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`OpenAI API error: ${(err as { error?: { message?: string } }).error?.message ?? res.statusText}`)
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('No response from OpenAI API')
  return text
}

async function translateWithAnthropic(
  content: string,
  apiKey: string,
  model?: string,
): Promise<string> {
  const modelId = model || 'claude-3-5-sonnet-20241022'
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 8192,
      system: TRANSLATE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Anthropic API error: ${(err as { error?: { message?: string } }).error?.message ?? res.statusText}`)
  }

  const data = await res.json() as {
    content?: Array<{ type: string; text?: string }>
  }
  const text = data.content?.find((c) => c.type === 'text')?.text
  if (!text) throw new Error('No response from Anthropic API')
  return text
}
