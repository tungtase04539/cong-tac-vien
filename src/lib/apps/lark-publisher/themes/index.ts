export type { Theme } from './types'
export { larkThemes } from './lark'
export { classicThemes } from './classic'
export { modernThemes } from './modern'

import { larkThemes } from './lark'
import { classicThemes } from './classic'
import { modernThemes } from './modern'
import type { Theme } from './types'

export const allThemes: Theme[] = [...larkThemes, ...classicThemes, ...modernThemes]

export function getThemeById(id: string): Theme | undefined {
  return allThemes.find((t) => t.id === id)
}

export function getThemesByGroup(group: Theme['group']): Theme[] {
  return allThemes.filter((t) => t.group === group)
}
