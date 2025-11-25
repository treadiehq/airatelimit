<template>
  <div class="min-h-screen bg-black relative">
    <div class="radial-gradient absolute top-0 md:right-14 right-5"></div>
    <!-- Header -->
    <nav class="border-b border-gray-500/20 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-12">
          <!-- Logo -->
          <div class="flex items-center">
            <NuxtLink to="/" class="text-xl font-semibold text-white flex items-center gap-2">
              <img src="/logo.png" alt="AI Rate Limiting" class="w-6 h-6">
              <span class="text-base font-medium text-white">ai ratelimit</span>
            </NuxtLink>
          </div>
          
          <!-- Navigation -->
          <nav class="flex items-center space-x-4">
            <a href="https://github.com/treadiehq/airatelimit" class="text-gray-500 hover:text-white transition-colors cursor-pointer" title="GitHub" target="_blank" rel="noopener noreferrer">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"></path>
                </svg>
            </a>
            <NuxtLink to="/login" class="text-sm border border-gray-500/20 rounded-lg bg-gray-500/10 hover:bg-gray-500/15 transition-colors py-1.5! px-4!">
              Sign in
            </NuxtLink>
          </nav>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 antialiased">
      <div class="text-center">
        <!-- Main Heading -->
         <div class="mb-12">
          <h1 class="mb-5 text-3xl font-bold sm:mb-6 sm:text-5xl leading-tight text-white">
            <span class="text-blue-300">Usage limits and tier-based</span><br />pricing for AI APIs
          </h1>
          
          <!-- Subheading -->
          <p class="text-gray-400 text-sm leading-[1.6] sm:text-base">
            Track usage, enforce limits, and monetize your AI app without storing conversations
          </p>
        </div>
        
        <!-- Code Snippet -->
        <div class="max-w-3xl mx-auto mb-12">
          <div class="bg-gray-500/10 border border-gray-500/10 rounded-xl font-mono overflow-hidden shadow-2xl relative">
            <!-- Terminal Header -->
            <div class="border-b border-gray-500/10 flex items-center space-x-3 text-xs">
              <button 
                v-for="tab in tabs" 
                :key="tab.id"
                @click="activeTab = tab.id"
                :class="[
                  'px-3 py-3 transition-colors',
                  activeTab === tab.id 
                    ? 'border-b-2 border-blue-300 text-white' 
                    : 'text-gray-500 hover:text-gray-300'
                ]"
              >
                {{ tab.label }}
              </button>
            </div>
            
            <!-- Code Content -->
            <div class="p-4 px-4 text-left">
              <!-- JavaScript Tab -->
              <pre v-if="activeTab === 'javascript'" class="text-sm text-gray-300 font-mono leading-relaxed"><code><span class="text-gray-500">$</span> <span class="text-blue-300">npm</span> <span class="text-green-300">install @ai-ratelimit/sdk</span>
<span class="text-gray-500">$</span> <span class="text-purple-300">import</span> { createClient } <span class="text-purple-300">from</span> <span class="text-green-300">'@ai-ratelimit/sdk'</span>
<span class="text-gray-500">$</span> 
<span class="text-gray-500">$</span> <span class="text-purple-300">const</span> client = <span class="text-blue-300">createClient</span>({
    baseUrl: <span class="text-green-300">'https://airatelimit.com/api'</span>,
    projectKey: <span class="text-green-300">'pk_your_key_here'</span>
  })
<span class="text-gray-500">$</span>
<span class="text-gray-500">$</span> <span class="text-purple-300">const</span> result = <span class="text-purple-300">await</span> <span class="text-red-400">client</span>.<span class="text-blue-300">chat</span>({
    identity: <span class="text-green-300">'user-123'</span>,
    tier: <span class="text-green-300">'free'</span>,
    model: <span class="text-green-300">'gpt-4o'</span>,
    messages: [{ role: <span class="text-green-300">'user'</span>, content: <span class="text-green-300">'Hello!'</span> }]
  })</code></pre>

              <!-- API Tab -->
              <pre v-if="activeTab === 'api'" class="text-sm text-gray-300 font-mono leading-relaxed"><code><span class="text-gray-500">$</span> curl -X POST <span class="text-blue-300">https://airatelimit.com/api/v1/proxy/chat</span> \
  -H <span class="text-green-300">"x-project-key: pk_your_key_here"</span> \
  -H <span class="text-green-300">"Content-Type: application/json"</span> \
  -d <span class="text-green-300">'{
    "identity": "user-123",
    "tier": "free",
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'</span></code></pre>
              
              <button 
                @click="copyCode"
                class="absolute top-20 right-6 p-2 text-gray-500 hover:text-white transition"
                :class="{ 'text-green-300': copied }"
              >
                <svg v-if="!copied" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer aria-labelledby="footer-heading" class="pt-14">
      <h2 id="footer-heading" class="sr-only">Footer</h2>
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="border-t border-transparent flex flex-col md:flex-row items-center justify-between py-6">
          <div class="flex items-center justify-center gap-3 relative">
            <p class="text-xs leading-6 font-medium text-gray-500 xl:text-center">
              &copy; 2025 Treadie, Inc.
            </p>
          </div>
          <div
            class="flex space-x-6 items-center md:mt-0 mt-4"
          >
            <a
              href="https://discord.gg/KqdBcqRk5E"
              target="_blank"
              class="text-sm font-semibold leading-6 hover:text-blue-300 text-gray-500"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" class="h-5 w-5" fill="currentColor">
                <path d="M16.238 4.515a14.842 14.842 0 0 0-3.664-1.136.055.055 0 0 0-.059.027 10.35 10.35 0 0 0-.456.938 13.702 13.702 0 0 0-4.115 0 9.479 9.479 0 0 0-.464-.938.058.058 0 0 0-.058-.027c-1.266.218-2.497.6-3.664 1.136a.052.052 0 0 0-.024.02C1.4 8.023.76 11.424 1.074 14.782a.062.062 0 0 0 .024.042 14.923 14.923 0 0 0 4.494 2.272.058.058 0 0 0 .064-.02c.346-.473.654-.972.92-1.496a.057.057 0 0 0-.032-.08 9.83 9.83 0 0 1-1.404-.669.058.058 0 0 1-.029-.046.058.058 0 0 1 .023-.05c.094-.07.189-.144.279-.218a.056.056 0 0 1 .058-.008c2.946 1.345 6.135 1.345 9.046 0a.056.056 0 0 1 .059.007c.09.074.184.149.28.22a.058.058 0 0 1 .023.049.059.059 0 0 1-.028.046 9.224 9.224 0 0 1-1.405.669.058.058 0 0 0-.033.033.056.056 0 0 0 .002.047c.27.523.58 1.022.92 1.495a.056.056 0 0 0 .062.021 14.878 14.878 0 0 0 4.502-2.272.055.055 0 0 0 .016-.018.056.056 0 0 0 .008-.023c.375-3.883-.63-7.256-2.662-10.246a.046.046 0 0 0-.023-.021Zm-9.223 8.221c-.887 0-1.618-.814-1.618-1.814s.717-1.814 1.618-1.814c.908 0 1.632.821 1.618 1.814 0 1-.717 1.814-1.618 1.814Zm5.981 0c-.887 0-1.618-.814-1.618-1.814s.717-1.814 1.618-1.814c.908 0 1.632.821 1.618 1.814 0 1-.71 1.814-1.618 1.814Z"></path>
              </svg>
            </a>
            <a
              href="https://github.com/treadiehq/airatelimit"
              target="_blank"
              class="text-sm font-semibold leading-6 hover:text-blue-300 text-gray-500"
            >
              <svg
                aria-label="github"
                viewBox="0 0 14 14"
                class="h-4 w-4"
                fill="currentColor"
              >
                <path
                  d="M7 .175c-3.872 0-7 3.128-7 7 0 3.084 2.013 5.71 4.79 6.65.35.066.482-.153.482-.328v-1.181c-1.947.415-2.363-.941-2.363-.941-.328-.81-.787-1.028-.787-1.028-.634-.438.044-.416.044-.416.7.044 1.071.722 1.071.722.635 1.072 1.641.766 2.035.59.066-.459.24-.765.437-.94-1.553-.175-3.193-.787-3.193-3.456 0-.766.262-1.378.721-1.881-.065-.175-.306-.897.066-1.86 0 0 .59-.197 1.925.722a6.754 6.754 0 0 1 1.75-.24c.59 0 1.203.087 1.75.24 1.335-.897 1.925-.722 1.925-.722.372.963.131 1.685.066 1.86.46.48.722 1.115.722 1.88 0 2.691-1.641 3.282-3.194 3.457.24.219.481.634.481 1.29v1.926c0 .197.131.415.481.328C11.988 12.884 14 10.259 14 7.175c0-3.872-3.128-7-7-7z"
                  fill="currentColor"
                  fill-rule="evenodd"
                ></path>
              </svg>
            </a>
            <a
              href="https://twitter.com/treadieinc"
              target="_blank"
              class="hover:text-blue-300 text-gray-500"
            >
              <span class="sr-only">X formerly known as Twitter</span>
              <svg aria-label="X formerly known as Twitter" fill="currentColor" class="h-4 w-4" viewBox="0 0 22 20"><path d="M16.99 0H20.298L13.071 8.26L21.573 19.5H14.916L9.702 12.683L3.736 19.5H0.426L8.156 10.665L0 0H6.826L11.539 6.231L16.99 0ZM15.829 17.52H17.662L5.83 1.876H3.863L15.829 17.52Z" class="astro-3SDC4Q5U"></path></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'AI Ratelimit - Usage limits and tier-based pricing for AI APIs'
})

type TabId = 'javascript' | 'api'

const activeTab = ref<TabId>('api')
const copied = ref(false)

const tabs = [
  { id: 'api' as TabId, label: 'REST API' },
  { id: 'javascript' as TabId, label: 'JavaScript' },
]

const codeExamples: Record<TabId, string> = {
  javascript: `npm install @ai-ratelimit/sdk
import { createClient } from '@ai-ratelimit/sdk'

const client = createClient({
  baseUrl: 'https://airatelimit.com/api',
  projectKey: 'pk_your_key_here'
})

const result = await client.chat({
  identity: 'user-123',
  tier: 'free',
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }]
})`,
  api: `curl -X POST https://airatelimit.com/api/v1/proxy/chat \\
  -H "x-project-key: pk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "identity": "user-123",
    "tier": "free",
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'`
}

const copyCode = () => {
  const code = codeExamples[activeTab.value]
  navigator.clipboard.writeText(code)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>
