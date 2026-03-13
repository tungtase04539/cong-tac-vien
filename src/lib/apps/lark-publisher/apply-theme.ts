import type { Theme } from './themes/types'

export function applyTheme(html: string, theme: Theme): string {
  if (typeof window === 'undefined') return html
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild as HTMLElement
  for (const [selector, style] of Object.entries(theme.styles)) {
    if (selector === 'container') {
      root.setAttribute('style', (root.getAttribute('style') || '') + ';' + style)
      continue
    }
    root.querySelectorAll(selector).forEach((el) => {
      ;(el as HTMLElement).setAttribute(
        'style',
        ((el as HTMLElement).getAttribute('style') || '') + ';' + style,
      )
    })
  }
  return root.outerHTML
}
