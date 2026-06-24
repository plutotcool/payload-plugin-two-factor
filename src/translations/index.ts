import { en } from './en'
import { fr } from './fr'

export { en, fr }

export type PluginTwoFactorTranslations = (typeof en)['plugin-two-factor']
export type PluginTwoFactorTranslationKeys =
  `plugin-two-factor:${string & keyof PluginTwoFactorTranslations}`
