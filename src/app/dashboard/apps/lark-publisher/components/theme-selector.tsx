'use client'

import { allThemes, getThemesByGroup } from '@/lib/apps/lark-publisher/themes'
import type { Theme } from '@/lib/apps/lark-publisher/themes/types'

interface ThemeSelectorProps {
  value: string
  onChange: (themeId: string) => void
}

const GROUPS: { key: Theme['group']; label: string }[] = [
  { key: 'lark', label: 'Lark' },
  { key: 'classic', label: 'Classic' },
  { key: 'modern', label: 'Modern' },
]

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  const selectedTheme = allThemes.find((t) => t.id === value)

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="glass-input text-sm pr-8 appearance-none cursor-pointer"
        style={{ minWidth: '180px' }}
        title={selectedTheme?.description}
      >
        {GROUPS.map((group) => {
          const themes = getThemesByGroup(group.key)
          return (
            <optgroup key={group.key} label={group.label}>
              {themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </optgroup>
          )
        })}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}
