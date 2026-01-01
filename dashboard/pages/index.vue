<template>
  <div class="min-h-screen bg-black relative antialiased">
    <div class="radial-gradient absolute top-0 md:right-14 right-5"></div>
    <!-- Header -->
    <NavHeader />

    <!-- Hero Section -->
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-5 relative z-10">
      <div class="text-center">
        <!-- Main Heading -->
        <div class="mb-14">
          <h1 class="mx-auto w-full text-balance text-center font-semibold tracking-tight text-white max-w-3xl text-2xl !leading-[1.2] sm:text-4xl md:text-5xl lg:text-6xl">
            The <span class="text-blue-300">AI backend</span> your mobile app needs
          </h1>
          
          <!-- Subheading -->
          <p class="font-normal text-center text-gray-400 max-w-lg mx-auto sm:mt-4 text-pretty text-base sm:text-lg sm:leading-6 mb-10">
            Secure API keys, rate limit users, track costs, and monetize upgrades. Ready in 5 minutes.
          </p>
          <div class="flex items-center justify-center gap-2">
            <NuxtLink to="/signup" class="text-sm border justify-center w-44 font-medium flex items-center gap-2 rounded-lg bg-blue-300 border-blue-300 text-black hover:bg-blue-200 transition-colors py-2 px-4!">
              <span>Get Started</span>
            </NuxtLink>
            <a href="https://github.com/treadiehq/airatelimit" target="_blank" class="text-sm justify-center w-44 font-medium rounded-lg cursor-pointer flex items-center gap-2 text-white hover:bg-gray-500/10 py-2 px-4!">
              <span>View on Github</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
                <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM6.75 9.25a.75.75 0 0 0 0 1.5h4.59l-2.1 1.95a.75.75 0 0 0 1.02 1.1l3.5-3.25a.75.75 0 0 0 0-1.1l-3.5-3.25a.75.75 0 1 0-1.02 1.1l2.1 1.95H6.75Z" clip-rule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
        
        <!-- Main Tabs -->
        <div class="mb-12 relative z-10">
          <!-- Tab Switcher -->
          <div class="flex justify-center mb-6">
            <div class="inline-flex bg-gray-500/10 rounded-xl p-0.5 border border-gray-500/10">
              <button 
                @click="mainTab = 'snippet'"
                :class="[
                  'px-2.5 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5',
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
              <button 
                @click="mainTab = 'playground'"
                :class="[
                  'px-2.5 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5',
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
            </div>
          </div>

          <!-- Playground Tab Content -->
          <div v-show="mainTab === 'playground'">
            <RateLimitPlayground />
          </div>

          <!-- Snippet Tab Content -->
          <div v-show="mainTab === 'snippet'">
            <div class="bg-gray-500/10 inner-container mb-[-1px] ml-[-1px] relative border border-gray-500/10 rounded-lg overflow-hidden font-mono shadow-2xl shadow-black/50">
              <!-- Window Chrome Header -->
              <div class="flex items-center justify-between px-4 py-1 border-b border-gray-500/10">
                <div class="flex items-center gap-2">
                  <!-- Traffic lights -->
                  <div class="flex items-center gap-1.5">
                    <span class="w-3 h-3 rounded-full bg-red-400/80 hover:bg-red-400 transition-colors cursor-pointer"></span>
                    <span class="w-3 h-3 rounded-full bg-yellow-300/80 hover:bg-yellow-300 transition-colors cursor-pointer"></span>
                    <span class="w-3 h-3 rounded-full bg-green-300/80 hover:bg-green-300 transition-colors cursor-pointer"></span>
                  </div>
                  <!-- File name -->
                  <span class="text-xs text-gray-500 ml-3">{{ activeTab === 'javascript' ? 'app.ts' : 'terminal' }}</span>
                </div>
                
                <!-- Language tabs -->
                <div class="flex items-center gap-1 bg-gray-500/5 border border-gray-500/5 rounded-lg p-0.5">
                  <button 
                    v-for="tab in tabs" 
                    :key="tab.id"
                    @click="activeTab = tab.id"
                    :class="[
                      'px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200',
                      activeTab === tab.id 
                        ? 'bg-gray-500/10 text-white shadow-sm' 
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
                  :class="copied ? 'bg-green-300/10 text-green-300' : 'text-gray-500 hover:text-white hover:bg-gray-500/10'"
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
                <div class="select-none py-4 pl-4 pr-3 text-right border-r border-gray-500/10">
                  <div v-for="n in (activeTab === 'javascript' ? 15 : 8)" :key="n" class="text-xs text-gray-600 leading-relaxed font-mono">
                    {{ n }}
                  </div>
                </div>
                
                <!-- Code -->
                <div class="flex-1 p-4 overflow-x-auto">
                  <!-- JavaScript Tab -->
                  <pre v-if="activeTab === 'javascript'" class="text-sm text-gray-300 font-mono leading-relaxed"><code><span class="text-purple-300">import</span> <span class="text-cyan-300">OpenAI</span> <span class="text-purple-300">from</span> <span class="text-amber-300">'openai'</span>

<span class="text-purple-300">const</span> <span class="text-blue-300">openai</span> = <span class="text-purple-300">new</span> <span class="text-cyan-300">OpenAI</span>({
  <span class="text-blue-300">baseURL</span>: <span class="text-amber-300">'https://api.airatelimit.com/v1'</span>, <span class="text-gray-500 italic">// ← we proxy to OpenAI</span>
  <span class="text-blue-300">defaultHeaders</span>: {
    <span class="text-amber-300">'x-project-key'</span>: <span class="text-amber-300">'pk_xxx'</span>,       <span class="text-gray-500 italic">// ← your project (has API key)</span>
    <span class="text-amber-300">'x-identity'</span>: <span class="text-amber-300">'user-123'</span>,         <span class="text-gray-500 italic">// ← rate limit this user</span>
  },
})

<span class="text-gray-500 italic">// Works exactly like the OpenAI SDK</span>
<span class="text-purple-300">const</span> <span class="text-blue-300">response</span> = <span class="text-purple-300">await</span> <span class="text-blue-300">openai</span>.<span class="text-cyan-300">chat</span>.<span class="text-cyan-300">completions</span>.<span class="text-yellow-300">create</span>({
  <span class="text-blue-300">model</span>: <span class="text-amber-300">'gpt-4o'</span>,
  <span class="text-blue-300">messages</span>: [{ <span class="text-blue-300">role</span>: <span class="text-amber-300">'user'</span>, <span class="text-blue-300">content</span>: <span class="text-amber-300">'Hello!'</span> }]
})</code></pre>

                  <!-- API Tab -->
                  <pre v-if="activeTab === 'api'" class="text-sm text-gray-300 font-mono leading-relaxed"><code><span class="text-gray-500 italic"># Same OpenAI API—just a different base URL</span>
<span class="text-green-300">$</span> curl <span class="text-cyan-300">https://api.airatelimit.com/v1/chat/completions</span> \
  -H <span class="text-amber-300">"x-project-key: pk_xxx"</span> \       <span class="text-gray-500 italic"># your project (has API key)</span>
  -H <span class="text-amber-300">"x-identity: user-123"</span> \        <span class="text-gray-500 italic"># rate limit this user</span>
  -H <span class="text-amber-300">"Content-Type: application/json"</span> \
  -d <span class="text-amber-300">'{"model": "gpt-4o", "messages": [...]}'</span>

<span class="text-gray-500 italic"># We check limits → proxy to OpenAI → track cost → return response</span></code></pre>
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

    <!-- Integration Logos -->
    <section class="py-16 relative z-10">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <p class="text-center text-sm text-gray-400 mb-8">Works with your favorite AI providers</p>
        <div class="flex flex-wrap justify-center items-center gap-x-12 gap-y-8">
          <!-- OpenAI -->
          <div class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
            </svg>
            <span class="font-medium">OpenAI</span>
          </div>
          <!-- Anthropic -->
          <div class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.827 3.52h3.603L24 20.48h-3.603L13.827 3.52zm-7.258 0h3.767L16.906 20.48h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.569 3.52zm-.07 10.58h4.135L8.56 7.912l-2.06 6.188z"/>
            </svg>
            <span class="font-medium">Anthropic</span>
          </div>
          <!-- Google -->
          <div class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 11.807A9.002 9.002 0 0 1 10.049 2a9.942 9.942 0 0 1 1.951-.193c5.523 0 10 4.477 10 10 0 5.523-4.477 10-10 10-5.523 0-10-4.477-10-10 0-1.045.16-2.053.458-3H12v2.807z"/>
            </svg>
            <span class="font-medium">Gemini</span>
          </div>
          <!-- Mistral -->
          <div class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h4.5v4.5H3zm6.75 0h4.5v4.5h-4.5zM3 9.75h4.5v4.5H3zm13.5 0h4.5v4.5h-4.5zM3 16.5h4.5V21H3zm6.75 0h4.5V21h-4.5zm6.75 0h4.5V21h-4.5zM16.5 3H21v4.5h-4.5zM9.75 9.75h4.5v4.5h-4.5z"/>
            </svg>
            <span class="font-medium">Mistral</span>
          </div>
          <!-- Groq -->
          <!-- <div class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            <span class="font-medium">Groq</span>
          </div> -->
          <!-- xAI -->
          <div class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 4l7.6 8L2 20h2.6l6.2-6.4L17 20h5l-8-8.4L21.6 4H19l-5.8 6L7 4H2zm3.6 1.6h1.8l11 12.8h-1.8L5.6 5.6z"/>
            </svg>
            <span class="font-medium">xAI</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section id="features" class="py-20 relative z-10">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16 max-w-lg mx-auto">
          <h2 class="text-3xl font-semibold text-white mb-4">Your backend, handled</h2>
          <p class="font-normal text-center text-gray-400 max-w-md mx-auto sm:mt-4 text-pretty text-base sm:text-lg sm:leading-6 mb-10">Everything you'd build yourself, ready to go.</p>
        </div>
        <div class="grid md:grid-cols-2 gap-6">
          <!-- API Key Security -->
          <div class="bg-gray-500/10 border border-gray-500/10 rounded-xl p-6 hover:border-gray-500/15 transition-colors">
            <div class="w-10 h-10 bg-blue-300/10 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">API Key Security</h3>
            <p class="text-gray-400 text-sm leading-relaxed">Keep your OpenAI, Anthropic, and other API keys on the server. Users never see your credentials, even in mobile apps.</p>
          </div>
          <!-- Rate Limiting -->
          <div class="bg-gray-500/10 border border-gray-500/10 rounded-xl p-6 hover:border-gray-500/15 transition-colors">
            <div class="w-10 h-10 bg-amber-300/10 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Per-User Rate Limiting</h3>
            <p class="text-gray-400 text-sm leading-relaxed">Set daily, weekly, or monthly limits per user. Free tier users get 10 messages/day, Pro users get unlimited, you decide.</p>
          </div>
          <!-- Cost Tracking -->
          <div class="bg-gray-500/10 border border-gray-500/10 rounded-xl p-6 hover:border-gray-500/15 transition-colors">
            <div class="w-10 h-10 bg-green-300/10 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Cost Tracking</h3>
            <p class="text-gray-400 text-sm leading-relaxed">See exactly what each user costs you. Track token usage, model breakdown, and spending trends in real-time.</p>
          </div>
          <!-- Monetization -->
          <div class="bg-gray-500/10 border border-gray-500/10 rounded-xl p-6 hover:border-gray-500/15 transition-colors">
            <div class="w-10 h-10 bg-purple-300/10 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Upgrade Prompts</h3>
            <p class="text-gray-400 text-sm leading-relaxed">Show custom messages with deep links when users hit limits. "You've used 5/5 free requests, upgrade to Pro!" with your app's upgrade URL.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section id="how-it-works" class="py-20 relative z-10">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-semibold text-white mb-4">Get started in minutes</h2>
          <p class="text-gray-400 max-w-2xl mx-auto">Three simple steps to production-ready AI infrastructure.</p>
        </div>
        <div class="grid md:grid-cols-3 gap-8">
          <!-- Step 1 -->
          <div class="text-center">
            <div class="w-12 h-12 bg-blue-300/10 border border-blue-300/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span class="text-blue-300 font-semibold">1</span>
            </div>
            <h3 class="text-lg font-semibold text-white mb-3">Store your API keys with us</h3>
            <p class="text-gray-400 text-sm leading-relaxed">Create a your project, and add your provider keys. They stay secure on our servers.</p>
          </div>
          <!-- Step 2 -->
          <div class="text-center">
            <div class="w-12 h-12 bg-blue-300/10 border border-blue-300/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span class="text-blue-300 font-semibold">2</span>
            </div>
            <h3 class="text-lg font-semibold text-white mb-3">Change your SDK's base URL</h3>
            <p class="text-gray-400 text-sm leading-relaxed">One line change. We proxy to your provider and track every request per user.</p>
          </div>
          <!-- Step 3 -->
          <div class="text-center">
            <div class="w-12 h-12 bg-blue-300/10 border border-blue-300/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span class="text-blue-300 font-semibold">3</span>
            </div>
            <h3 class="text-lg font-semibold text-white mb-3">Everything's handled</h3>
            <p class="text-gray-400 text-sm leading-relaxed">See per-user usage. Block abuse. Trigger upgrade prompts. All automatic.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Comparison Table -->
    <section class="py-20 relative z-10">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-semibold text-white mb-4">Skip the boilerplate</h2>
          <p class="text-gray-400 max-w-2xl mx-auto">Building your own AI backend takes weeks. We do it in minutes.</p>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-xl overflow-hidden">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-500/10">
                <th class="text-left text-gray-400 font-medium text-sm p-4">Feature</th>
                <th class="text-center text-gray-400 font-medium text-sm p-4">Build Yourself</th>
                <th class="text-center text-blue-300 font-medium text-sm p-4">AI Ratelimit</th>
              </tr>
            </thead>
            <tbody class="text-sm">
              <tr class="border-b border-gray-500/10">
                <td class="text-gray-300 p-4">
                  <span class="group relative cursor-help">
                    API key proxy
                    <span class="invisible group-hover:visible absolute left-0 top-full mt-2 w-64 p-2 bg-black border border-gray-500/20 rounded-lg text-xs text-gray-300 z-10 shadow-lg">
                      Keep your OpenAI/Anthropic keys on the server. Users never see your credentials.
                    </span>
                  </span>
                </td>
                <td class="text-center text-gray-500 p-4">2-3 days</td>
                <td class="text-center text-blue-300 p-4">✓ Included</td>
              </tr>
              <tr class="border-b border-gray-500/10">
                <td class="text-gray-300 p-4">
                  <span class="group relative cursor-help">
                    Per-user rate limiting
                    <span class="invisible group-hover:visible absolute left-0 top-full mt-2 w-64 p-2 bg-black border border-gray-500/20 rounded-lg text-xs text-gray-300 z-10 shadow-lg">
                      Set daily, weekly, or monthly limits per user identity. Resets automatically.
                    </span>
                  </span>
                </td>
                <td class="text-center text-gray-500 p-4">1-2 weeks</td>
                <td class="text-center text-blue-300 p-4">✓ Included</td>
              </tr>
              <tr class="border-b border-gray-500/10">
                <td class="text-gray-300 p-4">
                  <span class="group relative cursor-help">
                    Usage & cost tracking
                    <span class="invisible group-hover:visible absolute left-0 top-full mt-2 w-64 p-2 bg-black border border-gray-500/20 rounded-lg text-xs text-gray-300 z-10 shadow-lg">
                      Track token usage and costs per user, per model, in real-time.
                    </span>
                  </span>
                </td>
                <td class="text-center text-gray-500 p-4">1-2 weeks</td>
                <td class="text-center text-blue-300 p-4">✓ Included</td>
              </tr>
              <tr class="border-b border-gray-500/10">
                <td class="text-gray-300 p-4">
                  <span class="group relative cursor-help">
                    Upgrade prompts
                    <span class="invisible group-hover:visible absolute left-0 top-full mt-2 w-64 p-2 bg-black border border-gray-500/20 rounded-lg text-xs text-gray-300 z-10 shadow-lg">
                      Show custom messages with deep links when users hit their limits.
                    </span>
                  </span>
                </td>
                <td class="text-center text-gray-500 p-4">3-5 days</td>
                <td class="text-center text-blue-300 p-4">✓ Included</td>
              </tr>
              <tr class="border-b border-gray-500/10">
                <td class="text-gray-300 p-4">
                  <span class="group relative cursor-help">
                    Per-model limits
                    <span class="invisible group-hover:visible absolute left-0 top-full mt-2 w-64 p-2 bg-black border border-gray-500/20 rounded-lg text-xs text-gray-300 z-10 shadow-lg">
                      Different limits per model: gpt-4o (expensive) vs gemini (cheap).
                    </span>
                  </span>
                </td>
                <td class="text-center text-gray-500 p-4">3-5 days</td>
                <td class="text-center text-blue-300 p-4">✓ Included</td>
              </tr>
              <tr class="border-b border-gray-500/10">
                <td class="text-gray-300 p-4">
                  <span class="group relative cursor-help">
                    Plan tiers (free/pro)
                    <span class="invisible group-hover:visible absolute left-0 top-full mt-2 w-64 p-2 bg-black border border-gray-500/20 rounded-lg text-xs text-gray-300 z-10 shadow-lg">
                      Different limits for free vs pro users. Just pass x-tier header.
                    </span>
                  </span>
                </td>
                <td class="text-center text-gray-500 p-4">1-2 weeks</td>
                <td class="text-center text-blue-300 p-4">✓ Included</td>
              </tr>
              <tr class="border-b border-gray-500/10">
                <td class="text-gray-300 p-4">
                  <span class="group relative cursor-help">
                    Prompt injection protection
                    <span class="invisible group-hover:visible absolute left-0 top-full mt-2 w-64 p-2 bg-black border border-gray-500/20 rounded-lg text-xs text-gray-300 z-10 shadow-lg">
                      Detect and block jailbreak attempts to extract your system prompts.
                    </span>
                  </span>
                </td>
                <td class="text-center text-gray-500 p-4">1-2 weeks</td>
                <td class="text-center text-blue-300 p-4">✓ Included</td>
              </tr>
              <tr class="border-b border-gray-500/10">
                <td class="text-gray-300 p-4">
                  <span class="group relative cursor-help">
                    Public endpoints
                    <span class="invisible group-hover:visible absolute left-0 top-full mt-2 w-64 p-2 bg-black border border-gray-500/20 rounded-lg text-xs text-gray-300 z-10 shadow-lg">
                      Call the API directly from browsers/mobile apps with origin-based security.
                    </span>
                  </span>
                </td>
                <td class="text-center text-gray-500 p-4">1-2 weeks</td>
                <td class="text-center text-blue-300 p-4">✓ Included</td>
              </tr>
              <tr class="border-b border-gray-500/10">
                <td class="text-gray-300 p-4">
                  <span class="group relative cursor-help">
                    Dashboard & analytics
                    <span class="invisible group-hover:visible absolute left-0 top-full mt-2 w-64 p-2 bg-black border border-gray-500/20 rounded-lg text-xs text-gray-300 z-10 shadow-lg">
                      Visual dashboard to manage projects, view usage, and configure limits.
                    </span>
                  </span>
                </td>
                <td class="text-center text-gray-500 p-4">2-3 weeks</td>
                <td class="text-center text-blue-300 p-4">✓ Included</td>
              </tr>
              <tr>
                <td class="text-white font-medium p-4">Total time</td>
                <td class="text-center text-gray-400 font-medium p-4">11-14 weeks</td>
                <td class="text-center text-blue-300 font-medium p-4">5 minutes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="py-20 relative z-10">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-semibold text-white mb-4">Simple, transparent pricing</h2>
          <p class="text-gray-400 max-w-2xl mx-auto">Start with a free trial, then choose a plan that fits.</p>
        </div>
        <div class="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <!-- Basic -->
          <div class="bg-gray-500/5 border border-gray-500/10 rounded-xl p-6 flex flex-col">
            <h3 class="text-lg font-semibold text-white mb-2">Basic</h3>
            <p class="text-gray-400 text-sm mb-6">For indie developers</p>
            <div class="mb-6">
              <span class="text-3xl font-bold text-white">$15</span>
              <span class="text-gray-500">/month</span>
            </div>
            <ul class="space-y-3 mb-8 flex-1">
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                100K requests/month
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                3 projects
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Cost tracking
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Usage analytics
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Email support
              </li>
            </ul>
            <NuxtLink to="/signup" class="block w-full text-center py-2 px-4 rounded-lg border border-gray-500/10 text-white hover:bg-gray-500/10 transition-colors text-sm font-medium mt-auto">
              Start your Free Trial
            </NuxtLink>
          </div>
          <!-- Pro -->
          <div class="bg-blue-300/5 border-2 border-blue-300/30 rounded-xl p-6 relative flex flex-col">
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-300 text-black text-xs font-semibold px-3 py-1 rounded-full">
              Popular
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Pro</h3>
            <p class="text-gray-400 text-sm mb-6">For growing apps</p>
            <div class="mb-6">
              <span class="text-3xl font-bold text-white">$50</span>
              <span class="text-gray-500">/month</span>
            </div>
            <ul class="space-y-3 mb-8 flex-1">
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                1M requests/month
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                50 projects
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Flow Designer
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Server-side prompts
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Smart routing
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Security
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Public endpoints
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Team (up to 5 members)
              </li>
            </ul>
            <NuxtLink to="/signup" class="block w-full text-center py-2 px-4 rounded-lg bg-blue-300 text-black hover:bg-blue-200 transition-colors text-sm font-medium mt-auto">
              Get Started
            </NuxtLink>
          </div>
          <!-- Enterprise -->
          <div class="bg-gray-500/5 border border-gray-500/10 rounded-xl p-6 flex flex-col">
            <h3 class="text-lg font-semibold text-white mb-2">Enterprise</h3>
            <p class="text-gray-400 text-sm mb-6">For large teams</p>
            <div class="mb-6">
              <span class="text-3xl font-bold text-white">Custom</span>
            </div>
            <ul class="space-y-3 mb-8 flex-1">
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Includes all in Pro
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Unlimited requests
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Unlimited projects
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Unlimited team members
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Self-hosting
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                SSO & SAML
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Audit logs
              </li>
              <li class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Dedicated support
              </li>
            </ul>
            <a href="mailto:info@treadie.com" class="block w-full text-center py-2 px-4 rounded-lg border border-gray-500/10 text-white hover:bg-gray-500/10 transition-colors text-sm font-medium mt-auto">
              Contact Sales
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Social Proof -->
    <!-- <section class="py-24 relative z-10">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-semibold text-white mb-4">Loved by developers</h2>
          <p class="text-gray-400 max-w-2xl mx-auto">Join hundreds of developers shipping AI apps faster.</p>
        </div>
        <div class="grid md:grid-cols-3 gap-6">
          <div class="bg-gray-500/5 border border-gray-500/10 rounded-xl p-6">
            <div class="flex items-center gap-1 mb-4">
              <svg class="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <svg class="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <svg class="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <svg class="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <svg class="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            </div>
            <p class="text-gray-300 text-sm mb-4 leading-relaxed">"Saved us weeks of backend work. We launched our AI chat app in a weekend instead of a month."</p>
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full"></div>
              <div>
                <p class="text-white text-sm font-medium">Alex Chen</p>
                <p class="text-gray-500 text-xs">Founder, ChatApp</p>
              </div>
            </div>
          </div>
          <div class="bg-gray-500/5 border border-gray-500/10 rounded-xl p-6">
            <div class="flex items-center gap-1 mb-4">
              <svg class="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <svg class="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <svg class="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <svg class="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <svg class="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            </div>
            <p class="text-gray-300 text-sm mb-4 leading-relaxed">"The rate limiting alone is worth it. No more surprise $500 bills from a single user abusing the API."</p>
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-gradient-to-br from-green-400 to-teal-500 rounded-full"></div>
              <div>
                <p class="text-white text-sm font-medium">Sarah Kim</p>
                <p class="text-gray-500 text-xs">CTO, WriteAI</p>
              </div>
            </div>
          </div>
          <div class="bg-gray-500/5 border border-gray-500/10 rounded-xl p-6">
            <div class="flex items-center gap-1 mb-4">
              <svg class="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <svg class="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <svg class="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <svg class="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <svg class="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            </div>
            <p class="text-gray-300 text-sm mb-4 leading-relaxed">"Finally, a way to monetize our AI features. The upgrade flow integration was seamless."</p>
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-full"></div>
              <div>
                <p class="text-white text-sm font-medium">Marcus Johnson</p>
                <p class="text-gray-500 text-xs">Indie Developer</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section> -->

    <!-- FAQ -->
    <section class="py-20 relative z-10">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-semibold text-white mb-4">Frequently asked questions</h2>
          <p class="text-gray-400 max-w-2xl mx-auto">Everything you need to know about AI Ratelimit.</p>
        </div>
        <div class="space-y-4">
          <!-- FAQ Item 1 -->
          <details class="group bg-gray-500/10 border border-gray-500/10 rounded-xl">
            <summary class="flex items-center justify-between p-6 cursor-pointer list-none">
              <h3 class="text-white font-medium">Do you store my users' conversations?</h3>
              <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div class="px-6 pb-6 text-gray-400 text-sm leading-relaxed">
              No. We're a proxy requests pass through us to your AI provider and back. We only log metadata (token counts, costs, timestamps) for rate limiting and analytics. Message content is never stored.
            </div>
          </details>
          <!-- FAQ Item 2 -->
          <details class="group bg-gray-500/10 border border-gray-500/10 rounded-xl">
            <summary class="flex items-center justify-between p-6 cursor-pointer list-none">
              <h3 class="text-white font-medium">Which AI providers do you support?</h3>
              <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div class="px-6 pb-6 text-gray-400 text-sm leading-relaxed">
              We support any OpenAI-compatible API, including OpenAI, Anthropic (via adapter), Google Gemini, Mistral, Groq, Together AI, and more. If it speaks the OpenAI protocol, it works.
            </div>
          </details>
          <!-- FAQ Item 3 -->
          <details class="group bg-gray-500/10 border border-gray-500/10 rounded-xl">
            <summary class="flex items-center justify-between p-6 cursor-pointer list-none">
              <h3 class="text-white font-medium">Can I self-host AI Ratelimit?</h3>
              <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div class="px-6 pb-6 text-gray-400 text-sm leading-relaxed">
              Yes! AI Ratelimit is open source. You can deploy it on your own infrastructure with Docker. Enterprise customers get dedicated support for self-hosted deployments.
            </div>
          </details>
          <!-- FAQ Item 4 -->
          <details class="group bg-gray-500/10 border border-gray-500/10 rounded-xl">
            <summary class="flex items-center justify-between p-6 cursor-pointer list-none">
              <h3 class="text-white font-medium">How does the upgrade flow work?</h3>
              <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div class="px-6 pb-6 text-gray-400 text-sm leading-relaxed">
              When a user hits their rate limit, our API returns a 429 response with a custom message you configure, like "You've used 5/5 free requests. Upgrade to Pro!" with a deep link to your app's upgrade screen.
            </div>
          </details>
          <!-- FAQ Item 5 -->
          <details class="group bg-gray-500/10 border border-gray-500/10 rounded-lg">
            <summary class="flex items-center justify-between p-6 cursor-pointer list-none">
              <h3 class="text-white font-medium">What happens if I exceed my plan limits?</h3>
              <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div class="px-6 pb-6 text-gray-400 text-sm leading-relaxed">
              We'll notify you as you approach your limits. You can upgrade anytime, or we'll simply pause new requests until your next billing cycle. No surprise overages ever.
            </div>
          </details>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20 relative z-10">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl font-semibold text-white mb-4">Ready to ship your AI app?</h2>
        <p class="text-gray-400 mb-8 max-w-xl mx-auto">Start with a 7-day free trial. Set up in 5 minutes.</p>
        <div class="flex items-center justify-center gap-4">
          <NuxtLink to="/signup" class="text-sm font-medium px-8 py-2 rounded-lg bg-blue-300 text-black hover:bg-blue-200 transition-colors">
            Start your Free Trial
          </NuxtLink>
          <a href="https://github.com/treadiehq/airatelimit" target="_blank" class="text-sm font-medium px-6 py-2 rounded-lg flex items-center gap-2 text-white hover:bg-gray-500/10 transition-colors">
            View on GitHub
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
              <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM6.75 9.25a.75.75 0 0 0 0 1.5h4.59l-2.1 1.95a.75.75 0 0 0 1.02 1.1l3.5-3.25a.75.75 0 0 0 0-1.1l-3.5-3.25a.75.75 0 1 0-1.02 1.1l2.1 1.95H6.75Z" clip-rule="evenodd" />
            </svg>
          </a>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

useHead({
  title: 'AI Ratelimit'
})

type TabId = 'javascript' | 'api'
type MainTabId = 'playground' | 'snippet'

const mainTab = ref<MainTabId>('snippet')
const activeTab = ref<TabId>('javascript')
const copied = ref(false)

const tabs = [
  { id: 'javascript' as TabId, label: 'Node' },
  { id: 'api' as TabId, label: 'cURL' },
]

const codeExamples: Record<TabId, string> = {
  javascript: `import OpenAI from 'openai'

const openai = new OpenAI({
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
  api: `curl https://api.airatelimit.com/v1/chat/completions \\
  -H "x-project-key: pk_xxx" \\
  -H "x-identity: user-123" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "Hello!"}]}'`
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
