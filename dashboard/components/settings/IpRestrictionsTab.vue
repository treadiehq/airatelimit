<template>
  <div class="px-6 space-y-6">
    <!-- IP Restrictions Header -->
    <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <div>
          <h3 class="font-semibold text-white mb-2">IP Restrictions</h3>
          <p class="text-sm text-gray-400">
            Restrict API access to specific IP addresses or CIDR ranges. 
            This is an enterprise security feature to ensure requests only come from trusted networks.
          </p>
        </div>
      </div>
    </div>

    <!-- Enable IP Restrictions -->
    <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-semibold text-white mb-1">Enable IP Restrictions</h4>
          <p class="text-xs text-gray-400">Block requests from IP addresses not in your allowed list.</p>
        </div>
        <button
          type="button"
          @click="editForm.ipRestrictionsEnabled = !editForm.ipRestrictionsEnabled"
          :class="editForm.ipRestrictionsEnabled ? 'bg-blue-300' : 'bg-gray-500/20'"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
        >
          <span
            :class="editForm.ipRestrictionsEnabled ? 'translate-x-6' : 'translate-x-1'"
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          />
        </button>
      </div>

      <!-- Allowed IP Ranges -->
      <div v-if="editForm.ipRestrictionsEnabled" class="mt-6 pt-6 border-t border-gray-500/10">
        <label class="block text-sm font-semibold text-white mb-2">Allowed IP Ranges</label>
        <p class="text-xs text-gray-400 mb-4">
          Enter IP addresses or CIDR ranges. Examples:
          <code class="bg-gray-500/20 px-1 rounded">192.168.1.100</code>,
          <code class="bg-gray-500/20 px-1 rounded">10.0.0.0/8</code>,
          <code class="bg-gray-500/20 px-1 rounded">2001:db8::/32</code>
        </p>

        <!-- IP Ranges List -->
        <div class="space-y-2 mb-4">
          <div
            v-for="(range, idx) in editForm.allowedIpRanges"
            :key="idx"
            class="flex items-center gap-2"
          >
            <div class="flex-1 relative">
              <input
                v-model="editForm.allowedIpRanges[idx]"
                type="text"
                placeholder="192.168.1.0/24 or 10.0.0.1"
                :class="[
                  'w-full px-3 py-2 bg-gray-500/10 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/10 focus:border-blue-300/10',
                  validationErrors[idx as number] ? 'border-red-400/50' : 'border-gray-500/20'
                ]"
                @input="validateRange(idx as number)"
              />
              <p v-if="validationErrors[idx as number]" class="text-xs text-red-400 mt-1">
                {{ validationErrors[idx as number] }}
              </p>
            </div>
            <button
              @click="removeRange(idx as number)"
              class="p-2 text-gray-400 hover:text-red-400 transition-colors"
              title="Remove IP range"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Add Range Button -->
        <button
          @click="addRange"
          class="flex items-center gap-2 px-3 py-2 text-sm text-blue-300 hover:text-blue-300 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add IP Range
        </button>

        <!-- Common IP Range Suggestions -->
        <div v-if="editForm.allowedIpRanges.length === 0" class="mt-4 p-3 bg-gray-500/10 border border-gray-500/10 rounded-lg">
          <p class="text-xs text-gray-400 mb-2">Quick add common patterns:</p>
          <div class="flex flex-wrap gap-2">
            <button
              @click="addSuggestedRange('10.0.0.0/8')"
              class="px-2 py-1 text-xs bg-gray-500/20 text-gray-300 rounded hover:bg-gray-500/30 transition-colors"
            >
              10.0.0.0/8 (Private Class A)
            </button>
            <button
              @click="addSuggestedRange('172.16.0.0/12')"
              class="px-2 py-1 text-xs bg-gray-500/20 text-gray-300 rounded hover:bg-gray-500/30 transition-colors"
            >
              172.16.0.0/12 (Private Class B)
            </button>
            <button
              @click="addSuggestedRange('192.168.0.0/16')"
              class="px-2 py-1 text-xs bg-gray-500/20 text-gray-300 rounded hover:bg-gray-500/30 transition-colors"
            >
              192.168.0.0/16 (Private Class C)
            </button>
            <button
              @click="addSuggestedRange('127.0.0.1')"
              class="px-2 py-1 text-xs bg-gray-500/20 text-gray-300 rounded hover:bg-gray-500/30 transition-colors"
            >
              127.0.0.1 (Localhost)
            </button>
          </div>
        </div>

        <!-- Warning Notice -->
        <div v-if="editForm.ipRestrictionsEnabled && editForm.allowedIpRanges.length > 0" class="mt-4 p-3 bg-orange-300/10 border border-orange-300/10 rounded-lg">
          <div class="flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-orange-300 shrink-0 mt-0.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p class="text-sm text-orange-300 font-medium">Important</p>
              <p class="text-xs text-orange-300/70 mt-1">
                Make sure to include all IP addresses that need access to this project. 
                Requests from IPs not in this list will be blocked with a 403 Forbidden error.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <button
        @click="$emit('update')"
        :disabled="updating || hasValidationErrors"
        class="mt-6 w-full px-4 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ updating ? 'Saving...' : 'Save' }}
      </button>
    </div>

    <!-- How It Works -->
    <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6">
      <h4 class="text-sm font-semibold text-white mb-4">How IP Restrictions Work</h4>
      <div class="space-y-4">
        <div class="flex items-start gap-3">
          <div class="w-6 h-6 rounded-full bg-blue-300/20 text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">1</div>
          <div>
            <p class="text-sm text-white">Request arrives at the proxy</p>
            <p class="text-xs text-gray-400">Client IP is extracted from the request (supports proxies via X-Forwarded-For)</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="w-6 h-6 rounded-full bg-blue-300/20 text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">2</div>
          <div>
            <p class="text-sm text-white">IP is validated against allowed ranges</p>
            <p class="text-xs text-gray-400">Supports exact IPs and CIDR notation for subnets</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="w-6 h-6 rounded-full bg-blue-300/20 text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">3</div>
          <div>
            <p class="text-sm text-white">Request is allowed or blocked</p>
            <p class="text-xs text-gray-400">Blocked requests receive a 403 Forbidden response</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  projectId: string
  editForm: any
  updating: boolean
}>()

defineEmits<{
  (e: 'update'): void
}>()

// Initialize allowedIpRanges if not set
if (!props.editForm.allowedIpRanges) {
  props.editForm.allowedIpRanges = []
}

// Validation state
const validationErrors = ref<Record<number, string>>({})

const hasValidationErrors = computed(() => {
  return Object.keys(validationErrors.value).length > 0
})

// Simple IP/CIDR validation
const isValidIpOrCidr = (input: string): boolean => {
  if (!input || input.trim() === '') return true // Empty is OK (will be filtered out)
  
  const trimmed = input.trim()
  
  // IPv4 pattern: 1-3 digits . 1-3 digits . 1-3 digits . 1-3 digits
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  
  // IPv4 CIDR pattern: IPv4/prefix
  const ipv4CidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
  
  // IPv6 pattern (simplified - accepts common formats)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/
  
  // IPv6 CIDR pattern
  const ipv6CidrPattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}\/\d{1,3}$/
  
  if (ipv4Pattern.test(trimmed)) {
    // Validate each octet
    const octets = trimmed.split('.')
    return octets.every(o => {
      const n = parseInt(o, 10)
      return n >= 0 && n <= 255
    })
  }
  
  if (ipv4CidrPattern.test(trimmed)) {
    const [ip, prefix] = trimmed.split('/')
    const prefixNum = parseInt(prefix, 10)
    if (prefixNum < 0 || prefixNum > 32) return false
    const octets = ip.split('.')
    return octets.every(o => {
      const n = parseInt(o, 10)
      return n >= 0 && n <= 255
    })
  }
  
  if (ipv6Pattern.test(trimmed) || ipv6CidrPattern.test(trimmed)) {
    // Basic IPv6 validation
    if (trimmed.includes('/')) {
      const prefix = parseInt(trimmed.split('/')[1], 10)
      if (prefix < 0 || prefix > 128) return false
    }
    return true
  }
  
  return false
}

const validateRange = (index: number) => {
  const value = props.editForm.allowedIpRanges[index]
  if (value && value.trim() !== '' && !isValidIpOrCidr(value)) {
    validationErrors.value[index] = 'Invalid IP address or CIDR range'
  } else {
    delete validationErrors.value[index]
  }
}

const addRange = () => {
  props.editForm.allowedIpRanges.push('')
}

const removeRange = (index: number) => {
  props.editForm.allowedIpRanges.splice(index, 1)
  // Re-validate all
  const newErrors: Record<number, string> = {}
  props.editForm.allowedIpRanges.forEach((range: string, i: number) => {
    if (range && range.trim() !== '' && !isValidIpOrCidr(range)) {
      newErrors[i] = 'Invalid IP address or CIDR range'
    }
  })
  validationErrors.value = newErrors
}

const addSuggestedRange = (range: string) => {
  if (!props.editForm.allowedIpRanges.includes(range)) {
    props.editForm.allowedIpRanges.push(range)
  }
}
</script>
