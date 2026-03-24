<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import type { ToastType } from '@/utils/toast'

type ToastItem = {
  id: string
  type: ToastType
  message: string
  duration: number
}

const toasts = ref<ToastItem[]>([])
const queue: ToastItem[] = []
const timers = new Map<string, number>()
const hovering = new Set<string>()
const visualHovering = reactive(new Set<string>())

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const clearTimer = (id: string) => {
  const timer = timers.get(id)
  if (timer) {
    window.clearTimeout(timer)
    timers.delete(id)
  }
}

const removeToast = (id: string) => {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
  clearTimer(id)
  flushQueue()
}

const scheduleRemoval = (id: string, duration: number) => {
  if (hovering.has(id)) return
  clearTimer(id)
  const timer = window.setTimeout(() => removeToast(id), duration)
  timers.set(id, timer)
}

const showToast = (toast: ToastItem) => {
  toasts.value = [toast, ...toasts.value]
  scheduleRemoval(toast.id, toast.duration)
}

const flushQueue = () => {
  while (queue.length && toasts.value.length < 3) {
    const next = queue.shift()
    if (next) showToast(next)
  }
}

const handleToastEvent = (event: Event) => {
  const detail = (event as CustomEvent<ToastItem>).detail
  const toast: ToastItem = {
    id: detail?.id ?? makeId(),
    type: detail?.type ?? 'error',
    message: detail?.message ?? 'Ha ocurrido un error.',
    duration: detail?.duration ?? 5000,
  }

  if (toasts.value.length >= 3) {
    queue.push(toast)
    return
  }

  showToast(toast)
}

const handleMouseEnter = (id: string) => {
  hovering.add(id)
  clearTimer(id)
}

const handleMouseLeave = (id: string) => {
  hovering.delete(id)
  visualHovering.delete(id)
  scheduleRemoval(id, 3000)
}

const handleBodyEnter = (id: string) => {
  visualHovering.add(id)
}

const handleBodyLeave = (id: string) => {
  visualHovering.delete(id)
}

onMounted(() => {
  window.addEventListener('app:toast', handleToastEvent as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('app:toast', handleToastEvent as EventListener)
  timers.forEach((timer) => window.clearTimeout(timer))
  timers.clear()
})
</script>

<template>
  <div class="toast-stack" aria-live="assertive">
    <transition-group name="toast-stack" tag="div">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="[`toast--${toast.type}`, { 'toast--hover': visualHovering.has(toast.id) }]"
        @mouseenter="handleMouseEnter(toast.id)"
        @mouseleave="handleMouseLeave(toast.id)">
        <div class="toast-body" @mouseenter="handleBodyEnter(toast.id)" @mouseleave="handleBodyLeave(toast.id)">
          <strong>{{ toast.type === 'error' ? 'Ups, algo salio mal' : toast.type === 'warning' ? 'Atencion' : 'Todo listo' }}</strong>
          <span>{{ toast.message }}</span>
        </div>
        <button class="toast-close" type="button" aria-label="Cerrar alerta" @click="removeToast(toast.id)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M18 6 6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  top: 96px;
  right: 24px;
  z-index: 40;
  display: grid;
  gap: 10px;
  pointer-events: none;
}

.toast-stack > div {
  display: grid;
  gap: 10px;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: #fff;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
  min-width: 220px;
  max-width: 360px;
  transition: background 0.5s ease, box-shadow 0.5s ease, transform 0.5s ease;
}

.toast--hover {
  background: #fff5f6;
  box-shadow: 0 10px 20px rgba(239, 68, 68, 0.14);
  transform: translateY(2px);
}

.toast-body {
  display: grid;
  gap: 4px;
  font-weight: 600;
  font-size: 13px;
  color: #7f1d1d;
}

.toast--success {
  border-color: rgba(16, 185, 129, 0.3);
}

.toast--success.toast--hover {
  background: #f1fdf8;
  box-shadow: 0 10px 20px rgba(16, 185, 129, 0.14);
}

.toast--success .toast-body {
  color: #065f46;
}

.toast--warning {
  border-color: rgba(234, 179, 8, 0.35);
}

.toast--warning.toast--hover {
  background: #fff9e6;
  box-shadow: 0 10px 20px rgba(234, 179, 8, 0.14);
}

.toast--warning .toast-body {
  color: #854d0e;
}

.toast-close {
  margin-left: auto;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: inherit;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.toast-close svg {
  width: 16px;
  height: 16px;
}

.toast-stack-enter-active,
.toast-stack-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.toast-stack-enter-from,
.toast-stack-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.toast-stack-move {
  transition: transform 0.5s ease;
}

@media (max-width: 1010px) {
  .toast-stack {
    right: 14px;
    left: 14px;
  }

  .toast {
    max-width: none;
  }
}

@media (max-width: 480px) {
  .toast-stack {
    top: 82px;
  }
}
</style>
