import { computed, type Ref } from 'vue'
import type { TenantTemplateSummary } from '@/services/tenantInvitations'
import type { InvitationTemplateModule } from '@/templates/types'

export const useInvitationEditorTemplateCapabilities = (
  templateModule: Ref<InvitationTemplateModule<'wedding'> | null>,
  template: Ref<TenantTemplateSummary | null>,
) => {
  const supportsInlineEditor = computed(() => {
    const moduleInlineEditor = templateModule.value?.capabilities?.inlineEditor
    if (typeof moduleInlineEditor === 'boolean') {
      return moduleInlineEditor
    }

    const rendererKey = String(template.value?.renderer_key ?? '').trim()
    return rendererKey === 'wedding_snow' || rendererKey === 'wedding_base_basic'
  })

  return {
    supportsInlineEditor,
  }
}
