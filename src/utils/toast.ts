export type ToastType = 'error' | 'success' | 'warning'

type ToastDetail = {
  id?: string
  type?: ToastType
  message?: string
  duration?: number
}

const dispatchToast = (detail: ToastDetail) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<ToastDetail>('app:toast', { detail }))
}

export const notifyError = (message = 'No pudimos completar la accion.', duration?: number) => {
  dispatchToast({ type: 'error', message, duration })
}

export const notifySuccess = (message = 'Operacion realizada.', duration?: number) => {
  dispatchToast({ type: 'success', message, duration })
}

export const notifyWarning = (message = 'Revisa los datos ingresados.', duration?: number) => {
  dispatchToast({ type: 'warning', message, duration })
}
