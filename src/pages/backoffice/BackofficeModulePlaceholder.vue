<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const moduleName = computed(() => {
  const label = route.meta.moduleLabel
  return typeof label === 'string' && label.trim() ? label : 'Modulo'
})

const moduleDescription = computed(() => {
  const description = route.meta.moduleDescription
  if (typeof description === 'string' && description.trim()) return description
  return 'Vista en construccion. Aqui administraremos esta seccion del dashboard.'
})
</script>

<template>
  <div class="container bo-placeholder">
    <h1>{{ moduleName }}</h1>
    <p>{{ moduleDescription }}</p>
  </div>
</template>
