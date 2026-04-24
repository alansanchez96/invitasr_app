import type { Ref } from 'vue'

const toCodePoints = (value: string): string[] => Array.from(value ?? '')

export const useInvitationEditorWallPreview = (
  expandedState: Ref<Record<number, boolean>>,
  previewLength = 160,
) => {
  const wallEditorMessageIsLong = (message: string): boolean =>
    toCodePoints(message).length > previewLength

  const wallEditorMessageExpanded = (messageId: number): boolean =>
    Boolean(expandedState.value[messageId])

  const wallEditorDisplayText = (messageId: number, message: string): string => {
    if (wallEditorMessageExpanded(messageId) || !wallEditorMessageIsLong(message)) {
      return message
    }

    const truncated = toCodePoints(message)
      .slice(0, previewLength)
      .join('')
      .trimEnd()

    return truncated ? `${truncated}…` : ''
  }

  const toggleWallEditorMessageExpanded = (messageId: number) => {
    expandedState.value = {
      ...expandedState.value,
      [messageId]: !wallEditorMessageExpanded(messageId),
    }
  }

  return {
    wallEditorMessageIsLong,
    wallEditorMessageExpanded,
    wallEditorDisplayText,
    toggleWallEditorMessageExpanded,
  }
}
