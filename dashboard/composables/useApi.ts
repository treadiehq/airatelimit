export const useApi = () => {
  const config = useRuntimeConfig()
  const { token } = useAuth()

  return async (endpoint: string, options: any = {}) => {
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token.value) {
      headers.Authorization = `Bearer ${token.value}`
    }

    const response = await fetch(`${config.public.apiBaseUrl}${endpoint}`, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || 'Request failed')
    }

    // Handle empty responses (204 No Content, etc.)
    const contentType = response.headers.get('content-type')
    if (response.status === 204 || !contentType?.includes('application/json')) {
      return null
    }

    return response.json()
  }
}

