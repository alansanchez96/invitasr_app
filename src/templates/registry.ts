import type { InvitationTemplateManifest, InvitationTemplateModule } from '@/templates/types'

type InvitationTemplateLoader = () => Promise<InvitationTemplateModule>

export const templateRegistry: Record<number, InvitationTemplateLoader> = {
  2: async () => {
    const [{ default: component }, { romanceLightManifest: manifest }] = await Promise.all([
      import('@/templates/wedding/romance-light/RomanceLightTemplate.vue'),
      import('@/templates/wedding/romance-light/manifest'),
    ])

    return { component, manifest }
  },
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

const loadRomanceLightTemplate: InvitationTemplateLoader = async () => templateRegistry[2]!()

export const templateRendererRegistry: Record<string, InvitationTemplateLoader> = {
  wedding_romance_light: loadRomanceLightTemplate,
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
  if (!loader) return null
  return loader()
}
