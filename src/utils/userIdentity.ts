const NAME_JOINERS = new Set([
  'de',
  'del',
  'la',
  'las',
  'los',
  'da',
  'das',
  'do',
  'dos',
  'van',
  'von',
  'di',
  'du',
  'y',
  'e',
])

const sanitizeWord = (word: string): string => word.replace(/[^A-Za-z0-9]/g, '').trim()

export const buildDisplayInitials = (fullName: string, fallback = 'CU'): string => {
  const trimmedName = fullName.trim()
  if (!trimmedName) return fallback

  const words = trimmedName
    .split(/\s+/)
    .map((word) => sanitizeWord(word))
    .filter(Boolean)

  if (!words.length) return fallback

  const meaningfulWords = words.filter((word) => !NAME_JOINERS.has(word.toLowerCase()))
  const source = meaningfulWords.length ? meaningfulWords : words

  if (source.length === 1) {
    const [word] = source
    return word.slice(0, 2).toUpperCase()
  }

  const first = source[0]?.charAt(0) ?? ''
  const last = source[source.length - 1]?.charAt(0) ?? ''
  return `${first}${last}`.toUpperCase()
}

export const buildAvatarPaletteStyle = (_seed: string) => {
  return {
    backgroundColor: '#B9A8F8',
    color: '#FFFFFF',
    borderColor: 'transparent',
  }
}
