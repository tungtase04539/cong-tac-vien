export interface Theme {
  id: string
  name: string
  description: string
  group: 'lark' | 'classic' | 'modern'
  styles: Record<string, string>
}
