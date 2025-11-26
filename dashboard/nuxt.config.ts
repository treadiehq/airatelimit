// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
    },
  },

  devServer: {
    port: 3001,
  },

  app: {
    head: {
      title: 'AI Ratelimit',
      meta: [
        { name: 'description', content: 'Add usage limits to your AI app in 5 minutes. Track usage per user, set limits per model, create pricing tiers.' },
        { property: 'og:title', content: 'AI Ratelimit' },
        { property: 'og:description', content: 'Add usage limits to your AI app in 5 minutes. Track usage per user, set limits per model, create pricing tiers.' },
        { property: 'og:image', content: '/airatelimit.png' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'AI Ratelimit' },
        { name: 'twitter:description', content: 'Add usage limits to your AI app in 5 minutes. Track usage per user, set limits per model, create pricing tiers.' },
        { name: 'twitter:image', content: '/airatelimit.png' },
      ],
      script: [
        {
          src: 'https://cdn.seline.com/seline.js',
          async: true,
          'data-token': '504d53ab24b600c',
        },
      ],
    },
  },

  // Use static generation for deployment
  ssr: false,
})

