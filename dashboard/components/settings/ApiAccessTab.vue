<template>
  <div class="px-6 space-y-6">
    <!-- Info Box -->
    <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-4">
      <h3 class="font-semibold text-white mb-2">API Keys</h3>
      <p class="text-sm text-gray-400">
        Use the <strong class="text-white">Project Key</strong> in client-side code (public).
        Use the <strong class="text-white">Secret Key</strong> for server-side API access only (private).
      </p>
    </div>

    <!-- Project Key (Public) -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-white">Project Key</label>
        <span class="text-xs text-gray-500">Public - safe for client code</span>
      </div>
      <div class="flex items-center bg-gray-500/10 border border-gray-500/10 rounded-lg overflow-hidden">
        <code class="flex-1 px-4 py-3 font-mono text-sm text-white">{{ project.projectKey }}</code>
        <button
          @click="copyKey(project.projectKey, 'Project key copied!')"
          class="px-2.5 py-2 mr-2 rounded-lg bg-transparent hover:bg-gray-500/10 text-white transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
      <p class="text-xs text-gray-500">
        Use in your app: <code class="bg-gray-500/20 px-1 py-1 rounded text-white">x-project-key: {{ project.projectKey }}</code>
      </p>
    </div>

    <!-- Secret Key (Private) -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-white">Secret Key</label>
        <span class="text-xs text-red-400">Private - server-side only</span>
      </div>
      <div class="flex items-center bg-gray-500/10 border border-gray-500/10 rounded-lg overflow-hidden">
        <code class="flex-1 px-4 py-3 font-mono text-sm text-white">
          {{ showSecretKey ? (project.secretKey || 'Not generated') : maskedSecretKey }}
        </code>
        <button
          @click="showSecretKey = !showSecretKey"
          class="px-2.5 py-2 mr-2 rounded-lg bg-transparent hover:bg-gray-500/10 text-gray-400 transition-colors"
          :title="showSecretKey ? 'Hide' : 'Show'"
        >
          <svg v-if="showSecretKey" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        <button
          v-if="canCopySecretKey"
          @click="copyKey(project.secretKey, 'Secret key copied!')"
          class="px-2.5 py-2 mr-2 rounded-lg bg-transparent hover:bg-gray-500/10 text-white transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
      <p class="text-xs text-gray-500">
        For programmatic API access: <code class="bg-gray-500/20 px-1 py-1 rounded text-white">Authorization: Bearer sk_xxx</code>
      </p>
    </div>

    <!-- Regenerate Secret Key -->
    <div class="pt-4 border-t border-gray-500/10">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-medium text-white">Regenerate Secret Key</h4>
          <p class="text-xs text-gray-400 mt-1">This will invalidate the current secret key immediately.</p>
        </div>
        <button
          @click="regenerateSecretKey"
          :disabled="regenerating"
          class="px-4 py-2 bg-gray-500/10 border border-gray-500/10 text-gray-400 text-sm font-medium rounded-lg hover:bg-gray-500/15 hover:text-white disabled:opacity-50 transition-colors"
        >
          {{ regenerating ? 'Regenerating...' : 'Regenerate' }}
        </button>
      </div>
    </div>

    <!-- Usage Example -->
    <div class="pt-4 border-t border-gray-500/10">
      <label class="block text-sm font-medium text-white mb-3">Example: Set per-user limits</label>
      <div class="relative">
        <pre class="bg-black border border-gray-500/20 rounded-lg p-4 overflow-x-auto text-xs"><code class="text-gray-300">curl -X POST https://api.airatelimit.com/api/projects/<span class="text-blue-300">{{ project.projectKey }}</span>/identities \
  -H "Authorization: Bearer <span class="text-red-400">{{ project.secretKey || 'sk_xxx' }}</span>" \
  -H "Content-Type: application/json" \
  -d '{"identity": "user-123", "requestLimit": 1000}'</code></pre>
        <button
          @click="copyExample"
          class="absolute top-2 right-2 px-2 py-1 bg-gray-500/15 hover:bg-gray-500/20 text-xs text-white rounded transition-colors"
        >
          {{ exampleCopied ? '✓ Copied' : 'Copy' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  project: any
}>()

const emit = defineEmits<{
  (e: 'update'): void
}>()

const api = useApi()
const { copy } = useClipboard()

const showSecretKey = ref(false)
const regenerating = ref(false)
const exampleCopied = ref(false)

const maskedSecretKey = computed(() => {
  if (!props.project?.secretKey) return 'sk_xxxxxxxxxxxxxx'
  return 'sk_' + 'x'.repeat(props.project.secretKey.length - 3)
})

// Only show copy when we have the real key (create/regenerate response), not the API masked placeholder
const canCopySecretKey = computed(() => {
  const k = props.project?.secretKey
  if (!k || k.length < 30) return false
  return /[a-f0-9]/i.test(k) // real keys contain hex; placeholder is sk_••••••••••••
})

const copyKey = async (key: string, message: string) => {
  await copy(key, message)
}

const regenerateSecretKey = async () => {
  if (!confirm('Are you sure? This will invalidate the current secret key immediately. Any services using it will stop working.')) {
    return
  }

  regenerating.value = true
  try {
    const result = await api(`/projects/${props.project.id}/regenerate-secret`, {
      method: 'POST',
    })
    props.project.secretKey = result.secretKey
    showSecretKey.value = true
  } catch (e) {
    console.error('Failed to regenerate secret key:', e)
  } finally {
    regenerating.value = false
  }
}

const copyExample = async () => {
  const example = `curl -X POST https://api.airatelimit.com/api/projects/${props.project.projectKey}/identities \\
  -H "Authorization: Bearer ${props.project.secretKey || 'sk_xxx'}" \\
  -H "Content-Type: application/json" \\
  -d '{"identity": "user-123", "requestLimit": 1000}'`
  await copy(example, 'Example copied!')
  exampleCopied.value = true
  setTimeout(() => { exampleCopied.value = false }, 2000)
}
</script>

