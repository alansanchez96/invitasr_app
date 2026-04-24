import { computed, ref, shallowRef, watch, type Ref } from 'vue'

type UseInvitationEditorHistoryOptions<TSnapshot> = {
  serializedState: Ref<string>
  isHydratingSnapshot: Ref<boolean>
  isApplyingUndo: Ref<boolean>
  isLoading: Ref<boolean>
  createSnapshot: () => TSnapshot
  cloneSnapshot: (snapshot: TSnapshot) => TSnapshot
  resolveSnapshotFromSerializedState: (serializedState: string) => TSnapshot | null
  applySnapshot: (snapshot: TSnapshot) => Promise<void> | void
  maxUndoItems?: number
  maxRegistryItems?: number
}

const DEFAULT_MAX_UNDO_ITEMS = 80
const DEFAULT_MAX_REGISTRY_ITEMS = 220

export const useInvitationEditorHistory = <TSnapshot>(
  options: UseInvitationEditorHistoryOptions<TSnapshot>,
) => {
  const undoStack = shallowRef<TSnapshot[]>([])
  const lastSavedSerializedState = ref('')
  const snapshotRegistry = new Map<string, TSnapshot>()

  const canUndo = computed(() => undoStack.value.length > 0)
  const hasUnsavedChanges = computed(
    () => Boolean(lastSavedSerializedState.value) && options.serializedState.value !== lastSavedSerializedState.value,
  )

  const registerSnapshotState = (serializedState: string, snapshot?: TSnapshot) => {
    if (!serializedState) return

    const value = snapshot ? options.cloneSnapshot(snapshot) : options.createSnapshot()
    snapshotRegistry.set(serializedState, value)

    const maxRegistryItems = options.maxRegistryItems ?? DEFAULT_MAX_REGISTRY_ITEMS
    if (snapshotRegistry.size <= maxRegistryItems) return

    const overflow = snapshotRegistry.size - maxRegistryItems
    for (let index = 0; index < overflow; index += 1) {
      const oldest = snapshotRegistry.keys().next()
      if (oldest.done) break
      snapshotRegistry.delete(oldest.value)
    }
  }

  const resolveSnapshotBySerializedState = (serializedState: string): TSnapshot | null => {
    const registered = snapshotRegistry.get(serializedState)
    if (registered) return options.cloneSnapshot(registered)
    return options.resolveSnapshotFromSerializedState(serializedState)
  }

  const pushUndoSnapshot = (snapshot: TSnapshot | null) => {
    if (!snapshot) return
    undoStack.value.push(options.cloneSnapshot(snapshot))

    const maxUndoItems = options.maxUndoItems ?? DEFAULT_MAX_UNDO_ITEMS
    if (undoStack.value.length > maxUndoItems) {
      undoStack.value.splice(0, undoStack.value.length - maxUndoItems)
    }
  }

  const resetHistory = () => {
    undoStack.value = []
    snapshotRegistry.clear()
  }

  const markStateAsSaved = () => {
    lastSavedSerializedState.value = options.serializedState.value
    resetHistory()
    registerSnapshotState(lastSavedSerializedState.value)
  }

  const undoLastChange = async () => {
    const snapshot = undoStack.value.pop()
    if (!snapshot) return

    options.isApplyingUndo.value = true
    try {
      await options.applySnapshot(snapshot)
      registerSnapshotState(options.serializedState.value, snapshot)
    } finally {
      options.isApplyingUndo.value = false
    }
  }

  watch(options.serializedState, (nextState, previousState) => {
    if (!nextState) return

    registerSnapshotState(nextState)
    if (!previousState) return
    if (options.isHydratingSnapshot.value || options.isApplyingUndo.value || options.isLoading.value) return

    const previousSnapshot = resolveSnapshotBySerializedState(previousState)
    pushUndoSnapshot(previousSnapshot)
  })

  return {
    undoStack,
    canUndo,
    hasUnsavedChanges,
    lastSavedSerializedState,
    registerSnapshotState,
    resolveSnapshotBySerializedState,
    pushUndoSnapshot,
    resetHistory,
    markStateAsSaved,
    undoLastChange,
  }
}

export type UseInvitationEditorHistoryReturn<TSnapshot> = ReturnType<typeof useInvitationEditorHistory<TSnapshot>>
