<template>
  <Teleport to="body">
    <div v-if="active" class="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <div
        v-for="(particle, i) in particles"
        :key="i"
        class="absolute w-3 h-3 rounded-sm"
        :style="{
          left: particle.x + '%',
          top: particle.y + '%',
          backgroundColor: particle.color,
          transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
          opacity: particle.opacity,
          transition: 'all 0.1s linear',
        }"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  rotation: number
  rotationSpeed: number
  scale: number
  opacity: number
}

const props = withDefaults(defineProps<{
  particleCount?: number
  spread?: number
  colors?: string[]
  duration?: number
}>(), {
  particleCount: 100,
  spread: 70,
  colors: () => ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffd700', '#ff6b6b'],
  duration: 3000,
})

const active = ref(false)
const particles = ref<Particle[]>([])
let animationFrame: number | null = null

const createParticles = () => {
  const centerX = 50
  const centerY = 30
  
  particles.value = Array.from({ length: props.particleCount }, () => ({
    x: centerX,
    y: centerY,
    vx: (Math.random() - 0.5) * props.spread * 0.5,
    vy: Math.random() * -15 - 5,
    color: props.colors[Math.floor(Math.random() * props.colors.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 20,
    scale: Math.random() * 0.5 + 0.5,
    opacity: 1,
  }))
}

const animate = () => {
  particles.value = particles.value.map(p => ({
    ...p,
    x: p.x + p.vx,
    y: p.y + p.vy,
    vy: p.vy + 0.3, // gravity
    rotation: p.rotation + p.rotationSpeed,
    opacity: Math.max(0, p.opacity - 0.01),
  }))
  
  if (particles.value.some(p => p.opacity > 0)) {
    animationFrame = requestAnimationFrame(animate)
  } else {
    active.value = false
  }
}

const fire = () => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  active.value = true
  createParticles()
  animationFrame = requestAnimationFrame(animate)
  
  setTimeout(() => {
    active.value = false
    if (animationFrame) cancelAnimationFrame(animationFrame)
  }, props.duration)
}

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
})

defineExpose({ fire })
</script>

