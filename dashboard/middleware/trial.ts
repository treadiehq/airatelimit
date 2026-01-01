/**
 * Subscription/Trial Expiration Middleware
 * 
 * Redirects users with expired trials or subscriptions to the billing page.
 * Only applies in cloud mode.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Skip on server-side
  if (process.server) return

  // Get runtime config directly
  const config = useRuntimeConfig()
  const deploymentMode = config.public.deploymentMode as string
  
  // Only check in cloud mode
  if (deploymentMode !== 'cloud') {
    return
  }

  // Allow access to billing page, auth pages, and public pages
  const allowedPaths = ['/billing', '/login', '/signup', '/auth', '/']
  if (allowedPaths.some(path => to.path === path || to.path.startsWith('/auth/'))) {
    return
  }

  // Check if user is authenticated
  const token = localStorage.getItem('accessToken')
  if (!token) {
    return // Auth middleware will handle redirect
  }

  const apiBaseUrl = config.public.apiBaseUrl as string

  try {
    // Check subscription status first
    const subResponse = await fetch(`${apiBaseUrl}/billing/subscription`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (subResponse.ok) {
      const text = await subResponse.text()
      if (text) {
        const subscription = JSON.parse(text)
        
        // If they have an active subscription, allow access
        if (subscription?.status === 'active' || subscription?.status === 'trialing') {
          return
        }
        
        // Any other subscription status (canceled, expired, unpaid, past_due,
        // incomplete, incomplete_expired, paused) means payment is required
        if (subscription?.status) {
          return navigateTo('/billing')
        }
      }
    }

    // No subscription found - check trial status
    const trialResponse = await fetch(`${apiBaseUrl}/billing/trial`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (trialResponse.ok) {
      const text = await trialResponse.text()
      if (text) {
        const trialInfo = JSON.parse(text)
        
        if (trialInfo?.daysRemaining !== undefined && trialInfo.daysRemaining <= 0) {
          // Trial expired - redirect to billing
          return navigateTo('/billing')
        }
      }
    }
  } catch (error) {
    // If API fails, allow access (don't block users due to API issues)
    console.warn('[Subscription Middleware] Error:', error)
  }
})
