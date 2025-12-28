<template>
  <NuxtLayout>
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Feature Gate: Only show in cloud mode -->
      <FeatureGate
        feature="showBilling"
        title="Billing Not Available"
        description="Billing is only available on the cloud-hosted version of AI Ratelimit."
      >
        <div class="space-y-8">
          <!-- Header -->
          <div>
            <h1 class="text-xl font-bold text-white">Billing</h1>
            <p class="text-gray-400 mt-1 text-sm">Manage your subscription and payment methods.</p>
          </div>

          <!-- Billing Section -->
          <BillingSection />

          <!-- Usage Stats -->
          <!-- <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-white mb-4">Usage This Month</h3>
            <div class="grid md:grid-cols-3 gap-6">
              <div>
                <p class="text-sm text-gray-400">Total Requests</p>
                <p class="text-2xl font-bold text-white">{{ formatNumber(usageStats.requests) }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-400">Total Tokens</p>
                <p class="text-2xl font-bold text-white">{{ formatNumber(usageStats.tokens) }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-400">Projects</p>
                <p class="text-2xl font-bold text-white">{{ usageStats.projects }}</p>
              </div>
            </div>
          </div> -->

          <!-- Invoices -->
          <!-- <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-white mb-4">Invoices</h3>
            <div v-if="invoices.length > 0" class="space-y-3">
              <div
                v-for="invoice in invoices"
                :key="invoice.id"
                class="flex items-center justify-between p-3 bg-gray-500/10 rounded-lg"
              >
                <div>
                  <p class="text-sm font-medium text-white">{{ formatDate(invoice.date) }}</p>
                  <p class="text-xs text-gray-400">{{ invoice.description }}</p>
                </div>
                <div class="flex items-center gap-4">
                  <span class="text-sm font-medium text-white">${{ invoice.amount }}</span>
                  <a
                    :href="invoice.pdfUrl"
                    target="_blank"
                    class="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Download
                  </a>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-gray-400">No invoices yet.</p>
          </div> -->
        </div>
      </FeatureGate>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

useHead({
  title: 'Billing - AI Ratelimit'
})

const api = useApi()

interface Invoice {
  id: string
  date: string
  description: string
  amount: number
  pdfUrl: string
}

const usageStats = ref({
  requests: 0,
  tokens: 0,
  projects: 0,
})

const invoices = ref<Invoice[]>([])

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const loadBillingData = async () => {
  try {
    const [stats, invoiceData] = await Promise.all([
      api('/billing/usage').catch(() => ({ requests: 0, tokens: 0, projects: 0 })),
      api('/billing/invoices').catch(() => []),
    ])
    usageStats.value = stats
    invoices.value = invoiceData
  } catch (err) {
    console.error('Failed to load billing data:', err)
  }
}

onMounted(() => {
  loadBillingData()
})
</script>

