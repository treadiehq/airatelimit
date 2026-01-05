// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  vue: {
    compilerOptions: {
      // Treat el-* components from @tailwindplus/elements as custom elements
      isCustomElement: (tag) => tag.startsWith('el-'),
    },
  },

  css: ['~/assets/css/main.css'],

  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
      deploymentMode: process.env.NUXT_PUBLIC_DEPLOYMENT_MODE || 'self-hosted',
      stripePublishableKey: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
      enterpriseUrl: process.env.NUXT_PUBLIC_ENTERPRISE_URL || 'mailto:enterprise@airatelimit.com?subject=Enterprise%20Inquiry',
      cloudSignupUrl: process.env.NUXT_PUBLIC_CLOUD_SIGNUP_URL || 'https://airatelimit.com/signup',
      adminEmails: process.env.NUXT_PUBLIC_ADMIN_EMAILS || '',
    },
  },

  devServer: {
    port: 3001,
  },

  app: {
    head: {
      title: 'AI Ratelimit',
      meta: [
        { name: 'description', content: 'Secure your API keys, rate limit users, track costs, and upsell upgrades, all without building a server.' },
        { property: 'og:title', content: 'AI Ratelimit' },
        { property: 'og:description', content: 'Secure your API keys, rate limit users, track costs, and upsell upgrades, all without building a server.' },
        { property: 'og:image', content: 'https://airatelimit.com/airatelimit.png' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'AI Ratelimit' },
        { name: 'twitter:description', content: 'Secure your API keys, rate limit users, track costs, and upsell upgrades, all without building a server.' },
        { name: 'twitter:image', content: 'https://airatelimit.com/airatelimit.png' },
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

  // Server config for Railway deployment
  nitro: {
    preset: 'node-server',
  },

  // Make sure to use PORT env var and bind to 0.0.0.0 in production
  $production: {
    nitro: {
      preset: 'node-server',
      // Bind to all interfaces for Railway
      host: '0.0.0.0',
    },
  },
})

