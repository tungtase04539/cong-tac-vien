'use client'

import { useRef } from 'react'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

interface ToolbarButton {
  label: string
  title: string
  action: (textarea: HTMLTextAreaElement, value: string, onChange: (v: string) => void) => void
}

function insertAround(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  before: string,
  after: string,
  placeholder: string,
) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = value.slice(start, end) || placeholder
  const newValue = value.slice(0, start) + before + selected + after + value.slice(end)
  onChange(newValue)
  setTimeout(() => {
    textarea.focus()
    textarea.setSelectionRange(
      start + before.length,
      start + before.length + selected.length,
    )
  }, 0)
}

function insertLine(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  prefix: string,
  placeholder: string,
) {
  const start = textarea.selectionStart
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart)
  onChange(newValue)
  setTimeout(() => {
    textarea.focus()
    const newPos = lineStart + prefix.length + (value.slice(lineStart, start) || placeholder).length
    textarea.setSelectionRange(newPos, newPos)
  }, 0)
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  {
    label: 'B',
    title: 'Bold',
    action: (ta, val, onChange) => insertAround(ta, val, onChange, '**', '**', 'bold text'),
  },
  {
    label: 'I',
    title: 'Italic',
    action: (ta, val, onChange) => insertAround(ta, val, onChange, '_', '_', 'italic text'),
  },
  {
    label: 'H1',
    title: 'Heading 1',
    action: (ta, val, onChange) => insertLine(ta, val, onChange, '# ', 'Heading 1'),
  },
  {
    label: 'H2',
    title: 'Heading 2',
    action: (ta, val, onChange) => insertLine(ta, val, onChange, '## ', 'Heading 2'),
  },
  {
    label: 'H3',
    title: 'Heading 3',
    action: (ta, val, onChange) => insertLine(ta, val, onChange, '### ', 'Heading 3'),
  },
  {
    label: '🔗',
    title: 'Link',
    action: (ta, val, onChange) => {
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const selected = val.slice(start, end) || 'link text'
      const newValue = val.slice(0, start) + `[${selected}](url)` + val.slice(end)
      onChange(newValue)
      setTimeout(() => {
        ta.focus()
        const urlStart = start + selected.length + 3
        ta.setSelectionRange(urlStart, urlStart + 3)
      }, 0)
    },
  },
  {
    label: '</>',
    title: 'Inline Code',
    action: (ta, val, onChange) => insertAround(ta, val, onChange, '`', '`', 'code'),
  },
  {
    label: '```',
    title: 'Code Block',
    action: (ta, val, onChange) => insertAround(ta, val, onChange, '```\n', '\n```', 'code block'),
  },
  {
    label: '≡',
    title: 'Unordered List',
    action: (ta, val, onChange) => insertLine(ta, val, onChange, '- ', 'list item'),
  },
  {
    label: '1.',
    title: 'Ordered List',
    action: (ta, val, onChange) => insertLine(ta, val, onChange, '1. ', 'list item'),
  },
  {
    label: '❝',
    title: 'Blockquote',
    action: (ta, val, onChange) => insertLine(ta, val, onChange, '> ', 'quote'),
  },
  {
    label: '🖼',
    title: 'Image',
    action: (ta, val, onChange) => {
      const start = ta.selectionStart
      const selected = val.slice(start, ta.selectionEnd) || 'alt text'
      const newValue = val.slice(0, start) + `![${selected}](image-url)` + val.slice(ta.selectionEnd)
      onChange(newValue)
      setTimeout(() => {
        ta.focus()
        const urlStart = start + selected.length + 4
        ta.setSelectionRange(urlStart, urlStart + 9)
      }, 0)
    },
  },
]

export function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex flex-wrap gap-1 px-3 py-2 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}
      >
        {TOOLBAR_BUTTONS.map((btn) => (
          <button
            key={btn.label}
            title={btn.title}
            type="button"
            onClick={() => {
              if (textareaRef.current) {
                btn.action(textareaRef.current, value, onChange)
              }
            }}
            className="px-2 py-1 rounded text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors min-w-[32px] text-center"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Start writing in Markdown...'}
        className="flex-1 w-full resize-none bg-transparent text-white/90 placeholder-white/30 p-4 focus:outline-none font-mono text-sm leading-relaxed"
        spellCheck={false}
      />
    </div>
  )
}
