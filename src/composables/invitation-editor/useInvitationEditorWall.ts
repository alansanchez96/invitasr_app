import { computed, ref, watch, type Ref } from 'vue'
import {
  deleteTenantInvitationWallMessage,
  getTenantInvitationWallMessages,
  updateTenantInvitationWallMessage,
  type TenantInvitationWallMessage,
  type TenantInvitationWallSummary,
} from '@/services/tenantInvitations'

type JsonRecord = Record<string, unknown>

type UseInvitationEditorWallOptions = {
  invitationId: Ref<number | null | undefined>
  contentDraft: Ref<JsonRecord>
  notifyError: (message: string) => void
  toRecord: (value: unknown) => JsonRecord
  cloneRecord: (value: unknown) => JsonRecord
  getByPath: (source: unknown, path: string) => unknown
  setByPath: (source: JsonRecord, path: string, value: unknown) => void
  asText: (value: unknown, fallback?: string) => string
}

const DEFAULT_WALL_SUMMARY: TenantInvitationWallSummary = {
  enabled: false,
  limit: null,
  used: 0,
  visible_count: 0,
  remaining: null,
}

export const useInvitationEditorWall = (options: UseInvitationEditorWallOptions) => {
  const isLoadingWallMessages = ref(false)
  const wallMessages = ref<TenantInvitationWallMessage[]>([])
  const wallSummary = ref<TenantInvitationWallSummary>({ ...DEFAULT_WALL_SUMMARY })
  const updatingWallMessageIds = ref<number[]>([])
  const pendingDeleteWallMessageIds = ref<number[]>([])
  const pendingWallMessageVisibilityById = ref<Record<number, boolean>>({})

  const wallMessagesInEditor = computed(() =>
    wallMessages.value
      .filter((item) => !pendingDeleteWallMessageIds.value.includes(item.id))
      .map((item) => {
        const override = pendingWallMessageVisibilityById.value[item.id]
        if (typeof override !== 'boolean') return item

        const nextStatus = override ? 'visible' : 'hidden'
        return {
          ...item,
          status: nextStatus,
          is_visible: override,
        }
      }),
  )

  const wallUsedCountInEditor = computed(() => wallMessagesInEditor.value.length)
  const wallVisibleCountInEditor = computed(() =>
    wallMessagesInEditor.value.filter((item) => item.is_visible).length,
  )
  const hasPendingWallMessageDeletes = computed(() => pendingDeleteWallMessageIds.value.length > 0)
  const hasPendingWallMessageVisibilityChanges = computed(
    () => Object.keys(pendingWallMessageVisibilityById.value).length > 0,
  )

  const syncWallSummaryWithEditorState = () => {
    wallSummary.value = {
      ...wallSummary.value,
      used: wallUsedCountInEditor.value,
      visible_count: wallVisibleCountInEditor.value,
      remaining: wallSummary.value.limit === null
        ? null
        : Math.max(0, Number(wallSummary.value.limit ?? 0) - wallUsedCountInEditor.value),
    }
  }

  const syncWallMessagesIntoContent = () => {
    const nextContent = options.cloneRecord(options.contentDraft.value)
    const currentWall = options.toRecord(options.getByPath(nextContent, 'wall'))

    const visibleMessages = wallMessagesInEditor.value
      .filter((item) => item.is_visible)
      .map((item) => ({
        id: String(item.id),
        guestName: item.guest_name,
        message: item.message,
        status: item.status,
        isVisible: item.is_visible,
        postedAt: item.posted_at,
      }))

    const nextWall = {
      title: options.asText(currentWall.title, 'Muro de mensajes'),
      description: options.asText(currentWall.description, 'Deja unas palabras lindas para este gran día.'),
      addLabel: options.asText(currentWall.addLabel, 'Añadir mensaje'),
      emptyStateLabel: options.asText(currentWall.emptyStateLabel, 'Sé la primera persona en dejar un mensaje.'),
      limit: wallSummary.value.limit,
      receivedCount: wallUsedCountInEditor.value,
      messages: visibleMessages,
    }

    options.setByPath(nextContent, 'wall', nextWall)
    options.contentDraft.value = nextContent
  }

  const sanitizePendingDeleteIds = (ids: number[]) => {
    const activeIds = new Set(wallMessages.value.map((item) => Number(item.id)))
    return ids
      .map((item) => Number(item))
      .filter((id, index, list) =>
        Number.isFinite(id) && id > 0 && activeIds.has(id) && list.indexOf(id) === index,
      )
  }

  const sanitizePendingVisibilityMap = (value: Record<number, boolean>) => {
    const activeIds = new Set(wallMessages.value.map((item) => Number(item.id)))
    return Object.entries(value).reduce<Record<number, boolean>>((carry, [rawId, rawVisible]) => {
      const id = Number(rawId)
      if (!Number.isFinite(id) || id <= 0 || !activeIds.has(id)) return carry
      carry[id] = Boolean(rawVisible)
      return carry
    }, {})
  }

  const setPendingDeleteWallMessageIds = (ids: number[]) => {
    pendingDeleteWallMessageIds.value = sanitizePendingDeleteIds(ids)
  }

  const setPendingWallMessageVisibilityById = (value: Record<number, boolean>) => {
    pendingWallMessageVisibilityById.value = sanitizePendingVisibilityMap(value)
  }

  const resetPendingWallChanges = () => {
    pendingDeleteWallMessageIds.value = []
    pendingWallMessageVisibilityById.value = {}
  }

  const loadWallMessagesData = async (payload?: { silent?: boolean }) => {
    const currentInvitationId = Number(options.invitationId.value ?? 0)
    if (!Number.isFinite(currentInvitationId) || currentInvitationId <= 0) return

    if (!payload?.silent) {
      isLoadingWallMessages.value = true
    }

    try {
      const response = await getTenantInvitationWallMessages(currentInvitationId)
      resetPendingWallChanges()
      wallSummary.value = response.wall
      wallMessages.value = response.items
      syncWallSummaryWithEditorState()
      syncWallMessagesIntoContent()
    } catch (error) {
      if (!payload?.silent) {
        const source = error as { message?: string }
        options.notifyError(source?.message ?? 'No pudimos cargar el muro de mensajes.')
      }
    } finally {
      if (!payload?.silent) {
        isLoadingWallMessages.value = false
      }
    }
  }

  const updateWallMessageVisibility = (messageId: number, visible: boolean) => {
    const source = wallMessages.value.find((item) => item.id === messageId)
    if (!source) return
    if (pendingDeleteWallMessageIds.value.includes(messageId)) return

    if (visible === source.is_visible) {
      const nextMap = { ...pendingWallMessageVisibilityById.value }
      delete nextMap[messageId]
      pendingWallMessageVisibilityById.value = nextMap
    } else {
      pendingWallMessageVisibilityById.value = {
        ...pendingWallMessageVisibilityById.value,
        [messageId]: visible,
      }
    }

    syncWallSummaryWithEditorState()
    syncWallMessagesIntoContent()
  }

  const queueDeleteWallMessage = (messageId: number): boolean => {
    if (pendingDeleteWallMessageIds.value.includes(messageId)) return false
    if (!wallMessages.value.some((item) => item.id === messageId)) return false

    pendingDeleteWallMessageIds.value = [...pendingDeleteWallMessageIds.value, messageId]
    syncWallSummaryWithEditorState()
    syncWallMessagesIntoContent()
    return true
  }

  const persistPendingWallMessageDeletes = async () => {
    const currentInvitationId = Number(options.invitationId.value ?? 0)
    if (!Number.isFinite(currentInvitationId) || currentInvitationId <= 0) return

    const pendingIds = sanitizePendingDeleteIds(pendingDeleteWallMessageIds.value)
    if (!pendingIds.length) return

    const deletedIds: number[] = []
    let firstError: unknown = null

    for (const messageId of pendingIds) {
      try {
        await deleteTenantInvitationWallMessage(currentInvitationId, messageId)
        deletedIds.push(messageId)
      } catch (error) {
        if (!firstError) {
          firstError = error
        }
      }
    }

    if (deletedIds.length) {
      wallMessages.value = wallMessages.value.filter((item) => !deletedIds.includes(item.id))
      pendingDeleteWallMessageIds.value = pendingDeleteWallMessageIds.value.filter((id) => !deletedIds.includes(id))
      const nextVisibilityMap = { ...pendingWallMessageVisibilityById.value }
      for (const id of deletedIds) {
        delete nextVisibilityMap[id]
      }
      pendingWallMessageVisibilityById.value = nextVisibilityMap
      syncWallSummaryWithEditorState()
      syncWallMessagesIntoContent()
    }

    if (firstError) {
      throw firstError
    }
  }

  const persistPendingWallMessageVisibilityChanges = async () => {
    const currentInvitationId = Number(options.invitationId.value ?? 0)
    if (!Number.isFinite(currentInvitationId) || currentInvitationId <= 0) return

    const pendingEntries = Object.entries(pendingWallMessageVisibilityById.value)
      .map(([rawId, rawVisible]) => ({ id: Number(rawId), visible: Boolean(rawVisible) }))
      .filter(({ id }) => Number.isFinite(id) && id > 0)
      .filter(({ id }) => !pendingDeleteWallMessageIds.value.includes(id))
      .filter(({ id }) => wallMessages.value.some((item) => item.id === id))

    if (!pendingEntries.length) return

    const updatedIds: number[] = []
    let firstError: unknown = null

    for (const entry of pendingEntries) {
      try {
        const response = await updateTenantInvitationWallMessage(currentInvitationId, entry.id, entry.visible)
        wallMessages.value = wallMessages.value.map((item) => (
          item.id === entry.id ? response.message : item
        ))
        updatedIds.push(entry.id)
      } catch (error) {
        if (!firstError) {
          firstError = error
        }
      }
    }

    if (updatedIds.length) {
      const nextMap = { ...pendingWallMessageVisibilityById.value }
      for (const id of updatedIds) {
        delete nextMap[id]
      }
      pendingWallMessageVisibilityById.value = nextMap
      syncWallSummaryWithEditorState()
      syncWallMessagesIntoContent()
    }

    if (firstError) {
      throw firstError
    }
  }

  watch(wallMessages, () => {
    const validDeleteIds = sanitizePendingDeleteIds(pendingDeleteWallMessageIds.value)
    if (validDeleteIds.length !== pendingDeleteWallMessageIds.value.length) {
      pendingDeleteWallMessageIds.value = validDeleteIds
    }

    const nextVisibilityMap = sanitizePendingVisibilityMap(pendingWallMessageVisibilityById.value)
    const currentEntries = Object.keys(pendingWallMessageVisibilityById.value).length
    const nextEntries = Object.keys(nextVisibilityMap).length
    if (currentEntries !== nextEntries) {
      pendingWallMessageVisibilityById.value = nextVisibilityMap
    }
  })

  return {
    isLoadingWallMessages,
    wallMessages,
    wallSummary,
    updatingWallMessageIds,
    pendingDeleteWallMessageIds,
    pendingWallMessageVisibilityById,
    wallMessagesInEditor,
    wallUsedCountInEditor,
    wallVisibleCountInEditor,
    hasPendingWallMessageDeletes,
    hasPendingWallMessageVisibilityChanges,
    syncWallSummaryWithEditorState,
    syncWallMessagesIntoContent,
    setPendingDeleteWallMessageIds,
    setPendingWallMessageVisibilityById,
    resetPendingWallChanges,
    loadWallMessagesData,
    updateWallMessageVisibility,
    queueDeleteWallMessage,
    persistPendingWallMessageDeletes,
    persistPendingWallMessageVisibilityChanges,
  }
}

export type UseInvitationEditorWallReturn = ReturnType<typeof useInvitationEditorWall>
