export const useAuth = () => {
  const user = useState<{ id: string; email: string } | null>('user', () => null)
  const token = useState<string | null>('token', () => null)

  const loadFromStorage = () => {
    if (process.client) {
      const storedToken = localStorage.getItem('accessToken')
      const storedUser = localStorage.getItem('user')
      
      if (storedToken && storedUser) {
        token.value = storedToken
        user.value = JSON.parse(storedUser)
      }
    }
  }

  const signup = async (email: string, password: string) => {
    const api = useApi()
    const data = await api('/auth/signup', {
      method: 'POST',
      body: { email, password },
    })

    token.value = data.accessToken
    user.value = data.user

    if (process.client) {
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('user', JSON.stringify(data.user))
    }

    return data
  }

  const login = async (email: string, password: string) => {
    const api = useApi()
    const data = await api('/auth/login', {
      method: 'POST',
      body: { email, password },
    })

    token.value = data.accessToken
    user.value = data.user

    if (process.client) {
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('user', JSON.stringify(data.user))
    }

    return data
  }

  const logout = () => {
    token.value = null
    user.value = null

    if (process.client) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
      localStorage.removeItem('organization')
    }

    navigateTo('/login')
  }

  const isAuthenticated = computed(() => !!token.value)

  return {
    user,
    token,
    signup,
    login,
    logout,
    isAuthenticated,
    loadFromStorage,
  }
}

