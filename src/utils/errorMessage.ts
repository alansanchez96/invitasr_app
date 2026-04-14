export const extractErrorMessage = (error: unknown, fallback = 'No pudimos completar la accion.') => {
  if (error && typeof error === 'object') {
    const payload = error as Record<string, unknown>
    const message = payload.message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}
