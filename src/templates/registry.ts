import type { InvitationTemplateManifest, InvitationTemplateModule } from '@/templates/types'

type InvitationTemplateLoader = () => Promise<InvitationTemplateModule>

export const templateRegistry: Record<number, InvitationTemplateLoader> = {
  1001: async () => {
    const [{ default: component }, { weddingSnowManifest: manifest }] = await Promise.all([
      import('@/templates/basic/boda/wedding-snow/WeddingSnowTemplate.vue'),
      import('@/templates/basic/boda/wedding-snow/manifest'),
    ])

    return { component, manifest }
  },
}

const loadWeddingSnowTemplate: InvitationTemplateLoader = async () => templateRegistry[1001]!()

export const templateRendererRegistry: Record<string, InvitationTemplateLoader> = {
  wedding_snow: loadWeddingSnowTemplate,
  wedding_base_basic: loadWeddingSnowTemplate,
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

export const loadTemplateModuleByRendererKey = async (rendererKey: string): Promise<InvitationTemplateModule | null> => {
  const normalized = rendererKey.trim()
  if (!normalized) return null
  const loader = templateRendererRegistry[normalized]
  if (!loader) {
    const fallback = templateRegistry[1001]
    return fallback ? fallback() : null
  }
  return loader()
}
