import { existsSync } from 'fs'
import { join } from 'path'

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const method = event.method
  const pathname = url.pathname
  
  // Log _nuxt requests with file existence check
  if (pathname.startsWith('/_nuxt/')) {
    const filename = pathname.replace('/_nuxt/', '')
    
    // Check various possible paths
    const paths = [
      join(process.cwd(), '.output', 'public', '_nuxt', filename),
      join(process.cwd(), '.output', 'server', 'chunks', 'public', '_nuxt', filename),
      join('/app', '.output', 'public', '_nuxt', filename),
      join('/app', '.output', 'server', 'chunks', 'public', '_nuxt', filename),
    ]
    
    console.log(`[ASSET REQUEST] ${pathname}`)
    console.log(`[CWD] ${process.cwd()}`)
    
    for (const p of paths) {
      const exists = existsSync(p)
      console.log(`  [PATH CHECK] ${p} -> ${exists ? 'EXISTS' : 'NOT FOUND'}`)
    }
  }
})
