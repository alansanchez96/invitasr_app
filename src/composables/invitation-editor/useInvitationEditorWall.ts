import { computed, ref, watch, type Ref } from 'vue'
import {
  deleteTenantInvitationWallMessage,
  getTenantInvitationWallMessages,
  updateTenantInvitationWallMessageOrder,
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
  const pendingWallMessageOrderIds = ref<number[] | null>(null)

  const getActiveWallMessageIds = () =>
    wallMessages.value
      .map((item) => Number(item.id))
      .filter((id) => Number.isFinite(id) && id > 0)

  const getEditorWallMessageIds = () =>
    getActiveWallMessageIds().filter((id) => !pendingDeleteWallMessageIds.value.includes(id))

  const normalizeWallMessageOrderIds = (ids: number[], sourceIds = getEditorWallMessageIds()) => {
    const sourceSet = new Set(sourceIds)
    const nextIds = ids
      .map((item) => Number(item))
      .filter((id, index, list) =>
        Number.isFinite(id) && id > 0 && sourceSet.has(id) && list.indexOf(id) === index,
      )

    for (const id of sourceIds) {
      if (!nextIds.includes(id)) {
        nextIds.push(id)
      }
    }

    return nextIds
  }

  const wallMessagesInEditor = computed(() => {
    const sourceMessages = wallMessages.value.filter((item) => !pendingDeleteWallMessageIds.value.includes(item.id))
    const sourceMap = new Map(sourceMessages.map((item) => [Number(item.id), item]))
    const orderIds = pendingWallMessageOrderIds.value
      ? normalizeWallMessageOrderIds(pendingWallMessageOrderIds.value, sourceMessages.map((item) => Number(item.id)))
      : sourceMessages.map((item) => Number(item.id))

    return orderIds
      .map((id) => sourceMap.get(id))
      .filter((item): item is TenantInvitationWallMessage => Boolean(item))
      .map((item) => {
        const override = pendingWallMessageVisibilityById.value[item.id]
        if (typeof override !== 'boolean') return item

        const nextStatus = override ? 'visible' : 'hidden'
        return {
          ...item,
          status: nextStatus,
          is_visible: override,
        }
      })
  })

  const wallUsedCountInEditor = computed(() => wallMessagesInEditor.value.length)
  const wallVisibleCountInEditor = computed(() =>
    wallMessagesInEditor.value.filter((item) => item.is_visible).length,
  )
  const hasPendingWallMessageDeletes = computed(() => pendingDeleteWallMessageIds.value.length > 0)
  const hasPendingWallMessageVisibilityChanges = computed(
    () => Object.keys(pendingWallMessageVisibilityById.value).length > 0,
  )
  const hasPendingWallMessageOrderChanges = computed(() => {
    if (!pendingWallMessageOrderIds.value) return false
    const sourceIds = getEditorWallMessageIds()
    const nextIds = normalizeWallMessageOrderIds(pendingWallMessageOrderIds.value, sourceIds)
    return nextIds.length === sourceIds.length && nextIds.some((id, index) => id !== sourceIds[index])
  })

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
        displayOrder: item.display_order,
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

  const setPendingWallMessageOrderIds = (ids: number[] | null | undefined) => {
    if (!Array.isArray(ids)) {
      pendingWallMessageOrderIds.value = null
      return
    }

    const sourceIds = getEditorWallMessageIds()
    const nextIds = normalizeWallMessageOrderIds(ids, sourceIds)
    pendingWallMessageOrderIds.value = nextIds.some((id, index) => id !== sourceIds[index]) ? nextIds : null
  }

  const resetPendingWallChanges = () => {
    pendingDeleteWallMessageIds.value = []
    pendingWallMessageVisibilityById.value = {}
    pendingWallMessageOrderIds.value = null
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
    setPendingWallMessageOrderIds(pendingWallMessageOrderIds.value ?? wallMessagesInEditor.value.map((item) => item.id))
    syncWallSummaryWithEditorState()
    syncWallMessagesIntoContent()
    return true
  }

  const canMoveWallMessage = (messageId: number, direction: -1 | 1): boolean => {
    const ids = wallMessagesInEditor.value.map((item) => Number(item.id))
    const currentIndex = ids.indexOf(Number(messageId))
    if (currentIndex < 0) return false
    const nextIndex = currentIndex + direction
    return nextIndex >= 0 && nextIndex < ids.length
  }

  const moveWallMessage = (messageId: number, direction: -1 | 1): boolean => {
    const ids = wallMessagesInEditor.value.map((item) => Number(item.id))
    const currentIndex = ids.indexOf(Number(messageId))
    const nextIndex = currentIndex + direction
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ids.length) return false

    const nextIds = [...ids]
    const [selected] = nextIds.splice(currentIndex, 1)
    if (selected === undefined) return false
    nextIds.splice(nextIndex, 0, selected)
    setPendingWallMessageOrderIds(nextIds)
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
      setPendingWallMessageOrderIds(pendingWallMessageOrderIds.value)
      syncWallSummaryWithEditorState()
      syncWallMessagesIntoContent()
    }

    if (firstError) {
      throw firstError
    }
  }

  const persistPendingWallMessageOrderChanges = async () => {
    const currentInvitationId = Number(options.invitationId.value ?? 0)
    if (!Number.isFinite(currentInvitationId) || currentInvitationId <= 0) return
    if (!hasPendingWallMessageOrderChanges.value || !pendingWallMessageOrderIds.value) return

    const nextIds = normalizeWallMessageOrderIds(pendingWallMessageOrderIds.value)
    if (!nextIds.length) return

    const response = await updateTenantInvitationWallMessageOrder(currentInvitationId, nextIds)
    wallMessages.value = response.items
    pendingWallMessageOrderIds.value = null
    syncWallSummaryWithEditorState()
    syncWallMessagesIntoContent()
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

    if (pendingWallMessageOrderIds.value) {
      setPendingWallMessageOrderIds(pendingWallMessageOrderIds.value)
    }
  })

  return {
    isLoadingWallMessages,
    wallMessages,
    wallSummary,
    updatingWallMessageIds,
    pendingDeleteWallMessageIds,
    pendingWallMessageVisibilityById,
    pendingWallMessageOrderIds,
    wallMessagesInEditor,
    wallUsedCountInEditor,
    wallVisibleCountInEditor,
    hasPendingWallMessageDeletes,
    hasPendingWallMessageVisibilityChanges,
    hasPendingWallMessageOrderChanges,
    syncWallSummaryWithEditorState,
    syncWallMessagesIntoContent,
    setPendingDeleteWallMessageIds,
    setPendingWallMessageVisibilityById,
    setPendingWallMessageOrderIds,
    resetPendingWallChanges,
    loadWallMessagesData,
    updateWallMessageVisibility,
    queueDeleteWallMessage,
    canMoveWallMessage,
    moveWallMessage,
    persistPendingWallMessageDeletes,
    persistPendingWallMessageVisibilityChanges,
    persistPendingWallMessageOrderChanges,
  }
}

export type UseInvitationEditorWallReturn = ReturnType<typeof useInvitationEditorWall>
