export const useOrganization = () => {
  const organization = useState<{ id: string; name: string; description?: string } | null>('organization', () => null)
  const api = useApi()

  const loadOrganization = async () => {
    if (process.client) {
      // Check if already loaded
      const cached = localStorage.getItem('organization')
      if (cached) {
        organization.value = JSON.parse(cached)
      }

      // Fetch fresh data
      try {
        const data = await api('/organizations/me')
        organization.value = data
        localStorage.setItem('organization', JSON.stringify(data))
      } catch (error) {
        console.error('Failed to load organization:', error)
      }
    }
  }

  const clearOrganization = () => {
    organization.value = null
    if (process.client) {
      localStorage.removeItem('organization')
    }
  }

  return {
    organization,
    loadOrganization,
    clearOrganization,
  }
}

