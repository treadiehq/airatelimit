export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

export const useToast = () => {
  const toasts = useState<Toast[]>('toasts', () => [])

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    const duration = toast.duration ?? 3000

    toasts.value.push({ ...toast, id })

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }

  const removeToast = (id: string) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  const success = (message: string, duration?: number) => {
    return addToast({ type: 'success', message, duration })
  }

  const error = (message: string, duration?: number) => {
    return addToast({ type: 'error', message, duration })
  }

  const info = (message: string, duration?: number) => {
    return addToast({ type: 'info', message, duration })
  }

  const warning = (message: string, duration?: number) => {
    return addToast({ type: 'warning', message, duration })
  }

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
  }
}

