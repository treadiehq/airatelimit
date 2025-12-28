<template>
  <div class="min-h-screen bg-black relative">
    <div class="radial-gradient absolute top-0 md:right-14 right-5"></div>
    <!-- Header -->
    <nav class=" bg-black/80 backdrop-blur-sm sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-15">
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
            <NuxtLink to="/login" class="text-sm border font-medium flex items-center gap-2 rounded-lg bg-gray-500/10 border-gray-500/10 text-white hover:bg-gray-500/20 transition-colors py-1.5! px-4!">
              <span>Sign In</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
                <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM6.75 9.25a.75.75 0 0 0 0 1.5h4.59l-2.1 1.95a.75.75 0 0 0 1.02 1.1l3.5-3.25a.75.75 0 0 0 0-1.1l-3.5-3.25a.75.75 0 1 0-1.02 1.1l2.1 1.95H6.75Z" clip-rule="evenodd" />
              </svg>

            </NuxtLink>
          </nav>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 antialiased">
      <div class="text-center">
        <!-- Main Heading -->
         <div class="mb-12">
          <h1 class="mx-auto w-full text-balance text-center font-semibold tracking-tight text-white max-w-3xl text-2xl !leading-[1.2] sm:text-4xl md:text-5xl">
            <span class="text-blue-300">Instant backend</span> for AI mobile apps
          </h1>
          
          <!-- Subheading -->
          <p class="font-normal text-center text-gray-400 max-w-md mx-auto mb-1 sm:mt-4 text-pretty text-base sm:text-lg sm:leading-6">
            <!-- Track usage, enforce limits, and monetize your AI app without storing conversations. -->
            Secure your API keys, rate limit users, track costs, and upsell upgrades, all without building a server.
          </p>
        </div>
        
        <!-- Main Tabs -->
        <div class="mb-12 relative z-10">
          <!-- Tab Switcher -->
          <div class="flex justify-center mb-6">
            <div class="inline-flex bg-gray-500/10 rounded-xl p-1 border border-gray-500/10">
              <button 
                @click="mainTab = 'playground'"
                :class="[
                  'px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2',
                  mainTab === 'playground' 
                    ? 'bg-gray-500/5 border border-gray-500/10 text-white' 
                    : 'text-gray-500 hover:text-gray-300 border border-transparent'
                ]"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Playground
              </button>
              <button 
                @click="mainTab = 'snippet'"
                :class="[
                  'px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2',
                  mainTab === 'snippet' 
                    ? 'bg-gray-500/5 border border-gray-500/10 text-white' 
                    : 'text-gray-500 hover:text-gray-300 border border-transparent'
                ]"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Snippet
              </button>
            </div>
          </div>

          <!-- Playground Tab Content -->
          <div v-show="mainTab === 'playground'">
            <RateLimitPlayground />
          </div>

          <!-- Snippet Tab Content -->
          <div v-show="mainTab === 'snippet'">
            <div class="bg-gray-900/80 inner-container mb-[-1px] ml-[-1px] relative border border-gray-500/20 rounded-lg overflow-hidden font-mono shadow-2xl shadow-black/50">
              <!-- Window Chrome Header -->
              <div class="flex items-center justify-between px-4 py-3 bg-gray-800/50 border-b border-gray-500/10">
                <div class="flex items-center gap-2">
                  <!-- Traffic lights -->
                  <div class="flex items-center gap-1.5">
                    <span class="w-3 h-3 rounded-full bg-red-400/80 hover:bg-red-400 transition-colors cursor-pointer"></span>
                    <span class="w-3 h-3 rounded-full bg-yellow-400/80 hover:bg-yellow-400 transition-colors cursor-pointer"></span>
                    <span class="w-3 h-3 rounded-full bg-green-400/80 hover:bg-green-400 transition-colors cursor-pointer"></span>
                  </div>
                  <!-- File name -->
                  <span class="text-xs text-gray-500 ml-3">{{ activeTab === 'javascript' ? 'app.ts' : 'terminal' }}</span>
                </div>
                
                <!-- Language tabs -->
                <div class="flex items-center gap-1 bg-gray-500/10 rounded-lg p-0.5">
                  <button 
                    v-for="tab in tabs" 
                    :key="tab.id"
                    @click="activeTab = tab.id"
                    :class="[
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                      activeTab === tab.id 
                        ? 'bg-gray-700/50 text-white shadow-sm' 
                        : 'text-gray-500 hover:text-gray-300'
                    ]"
                  >
                    {{ tab.label }}
                  </button>
                </div>
                
                <!-- Copy button -->
                <button 
                  @click="copyCode"
                  class="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all duration-200"
                  :class="copied ? 'bg-green-400/10 text-green-400' : 'text-gray-500 hover:text-white hover:bg-gray-500/10'"
                >
                  <svg v-if="!copied" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{{ copied ? 'Copied!' : 'Copy' }}</span>
                </button>
              </div>
              
              <!-- Code Content with Line Numbers -->
              <div class="flex text-left">
                <!-- Line numbers -->
                <div class="select-none py-4 pl-4 pr-3 text-right border-r border-gray-500/10 bg-gray-900/30">
                  <div v-for="n in (activeTab === 'javascript' ? 14 : 8)" :key="n" class="text-xs text-gray-600 leading-relaxed font-mono">
                    {{ n }}
                  </div>
                </div>
                
                <!-- Code -->
                <div class="flex-1 p-4 overflow-x-auto">
                  <!-- JavaScript Tab -->
                  <pre v-if="activeTab === 'javascript'" class="text-sm text-gray-300 font-mono leading-relaxed"><code><span class="text-purple-400">import</span> <span class="text-cyan-300">OpenAI</span> <span class="text-purple-400">from</span> <span class="text-amber-300">'openai'</span>

<span class="text-purple-400">const</span> <span class="text-blue-300">openai</span> = <span class="text-purple-400">new</span> <span class="text-cyan-300">OpenAI</span>({
  <span class="text-blue-300">apiKey</span>: <span class="text-amber-300">'sk-your-key'</span>, <span class="text-gray-500 italic">// Optional</span>
  <span class="text-blue-300">baseURL</span>: <span class="text-amber-300">'https://api.airatelimit.com/v1'</span>,
  <span class="text-blue-300">defaultHeaders</span>: {
    <span class="text-amber-300">'x-project-key'</span>: <span class="text-amber-300">'pk_xxx'</span>,
    <span class="text-amber-300">'x-identity'</span>: <span class="text-amber-300">'user-123'</span>,
  },
})

<span class="text-purple-400">const</span> <span class="text-blue-300">response</span> = <span class="text-purple-400">await</span> <span class="text-blue-300">openai</span>.<span class="text-cyan-300">chat</span>.<span class="text-cyan-300">completions</span>.<span class="text-yellow-300">create</span>({
  <span class="text-blue-300">model</span>: <span class="text-amber-300">'gpt-4o'</span>,
  <span class="text-blue-300">messages</span>: [{ <span class="text-blue-300">role</span>: <span class="text-amber-300">'user'</span>, <span class="text-blue-300">content</span>: <span class="text-amber-300">'Hello!'</span> }]
})</code></pre>

                  <!-- API Tab -->
                  <pre v-if="activeTab === 'api'" class="text-sm text-gray-300 font-mono leading-relaxed"><code><span class="text-green-400">$</span> curl -X POST <span class="text-cyan-300">https://api.airatelimit.com/v1/chat/completions</span> \
  -H <span class="text-amber-300">"Authorization: Bearer sk-your-key"</span> \ <span class="text-gray-500 italic"># Optional</span>
  -H <span class="text-amber-300">"x-project-key: pk_xxx"</span> \
  -H <span class="text-amber-300">"x-identity: user-123"</span> \
  -H <span class="text-amber-300">"Content-Type: application/json"</span> \
  -d <span class="text-amber-300">'{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'</span></code></pre>
                </div>
              </div>
              
              <!-- Corner accents -->
              <span class="main-section bottom-l absolute w-[1px] h-[1px] bottom-[-1px] left-[-1px]"></span>
              <span class="main-section bottom-l absolute w-[1px] h-[1px] bottom-[-1px] right-[-1px]"></span>
              <span class="main-section bottom-l absolute w-[1px] h-[1px] top-[-1px] right-[-1px]"></span>
              <span class="main-section bottom-l absolute w-[1px] h-[1px] top-[-1px] left-[-1px]"></span>
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
  title: 'AI Ratelimit'
})

type TabId = 'javascript' | 'api'
type MainTabId = 'playground' | 'snippet'

const mainTab = ref<MainTabId>('playground')
const activeTab = ref<TabId>('javascript')
const copied = ref(false)

const tabs = [
  { id: 'javascript' as TabId, label: 'Node' },
  { id: 'api' as TabId, label: 'cURL' },
]

const codeExamples: Record<TabId, string> = {
  javascript: `import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: 'sk-your-key', // Optional
  baseURL: 'https://api.airatelimit.com/v1',
  defaultHeaders: {
    'x-project-key': 'pk_xxx',
    'x-identity': 'user-123',
  },
})

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }]
})`,
  api: `curl -X POST https://api.airatelimit.com/v1/chat/completions \\
  -H "Authorization: Bearer sk-your-key" \\ # Optional
  -H "x-project-key: pk_xxx" \\
  -H "x-identity: user-123" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
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
