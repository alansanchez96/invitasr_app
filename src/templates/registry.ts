import type { InvitationTemplateManifest, InvitationTemplateModule } from '@/templates/types'

type InvitationTemplateLoader = () => Promise<InvitationTemplateModule>

export const templateRegistry: Record<number, InvitationTemplateLoader> = {
  42: async () => {
    const [{ default: component }, { template42Manifest: manifest }] = await Promise.all([
      import('@/templates/wedding/template-42/Template42.vue'),
      import('@/templates/wedding/template-42/manifest'),
    ])

    return { component, manifest }
  },
  43: async () => {
    const [{ default: component }, { template43Manifest: manifest }] = await Promise.all([
      import('@/templates/wedding/template-43/Template43.vue'),
      import('@/templates/wedding/template-43/manifest'),
    ])

    return { component, manifest }
  },
}

export const listRegisteredTemplateIds = () => Object.keys(templateRegistry).map((value) => Number(value))

export const loadTemplateModule = async (templateId: number): Promise<InvitationTemplateModule | null> => {
  const loader = templateRegistry[templateId]
  if (!loader) return null
  return loader()
}

export const loadTemplateManifest = async (templateId: number): Promise<InvitationTemplateManifest | null> => {
  const module = await loadTemplateModule(templateId)
  return module?.manifest ?? null
}
