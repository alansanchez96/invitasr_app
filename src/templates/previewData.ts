import { createWeddingSnowPreviewData } from '@/templates/basic/boda/wedding-snow/previewData'
import type {
  InvitationTemplateModule,
  InvitationTemplatePreviewDataContext,
  WeddingTemplateData,
} from '@/templates/types'

const cloneData = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export const createFallbackWeddingPreviewData = (
  context: InvitationTemplatePreviewDataContext = {},
): WeddingTemplateData => createWeddingSnowPreviewData(context)

export const resolveWeddingTemplatePreviewData = (
  module: InvitationTemplateModule<'wedding'> | null | undefined,
  context: InvitationTemplatePreviewDataContext = {},
): WeddingTemplateData => {
  if (module?.createPreviewData) {
    return cloneData(module.createPreviewData(context))
  }

  return createFallbackWeddingPreviewData(context)
}
