export default defineNuxtRouteMiddleware((to, from) => {
  const { isAuthenticated, loadFromStorage } = useAuth()

  // Load auth state from localStorage
  loadFromStorage()

  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }
})

