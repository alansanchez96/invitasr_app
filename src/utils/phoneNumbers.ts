import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js'

export type PhoneCountryOption = {
  iso: CountryCode
  name: string
  callingCode: string
  flag: string
  label: string
  closedLabel: string
}

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'AR'

const FEATURED_COUNTRIES: CountryCode[] = ['AR', 'US', 'MX', 'CO', 'CL', 'UY', 'PY', 'BO', 'PE', 'ES']

const timezoneCountryMap: Record<string, CountryCode> = {
  'America/Argentina': 'AR',
  'America/Buenos_Aires': 'AR',
  'America/Catamarca': 'AR',
  'America/Cordoba': 'AR',
  'America/Jujuy': 'AR',
  'America/Mendoza': 'AR',
  'America/Rosario': 'AR',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'Pacific/Honolulu': 'US',
  'America/Mexico_City': 'MX',
  'America/Bogota': 'CO',
  'America/Santiago': 'CL',
  'America/Montevideo': 'UY',
  'America/Asuncion': 'PY',
  'America/La_Paz': 'BO',
  'America/Lima': 'PE',
  'Europe/Madrid': 'ES',
}

const supportedCountries = new Set(getCountries() as CountryCode[])

const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
  ? new Intl.DisplayNames(['es'], { type: 'region' })
  : null

const countryName = (country: CountryCode): string =>
  regionNames?.of(country) ?? country

export const countryFlag = (country: CountryCode): string =>
  country
    .toUpperCase()
    .replace(/./g, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))

export const PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = (getCountries() as CountryCode[])
  .map((iso) => {
    const callingCode = getCountryCallingCode(iso)
    const name = countryName(iso)

    return {
      iso,
      name,
      callingCode,
      flag: countryFlag(iso),
      label: `${name} (+${callingCode})`,
      closedLabel: `${countryFlag(iso)} (+${callingCode})`,
    }
  })
  .sort((a, b) => {
    const featuredA = FEATURED_COUNTRIES.indexOf(a.iso)
    const featuredB = FEATURED_COUNTRIES.indexOf(b.iso)
    if (featuredA >= 0 || featuredB >= 0) {
      if (featuredA < 0) return 1
      if (featuredB < 0) return -1
      return featuredA - featuredB
    }

    return a.name.localeCompare(b.name, 'es')
  })

export const isSupportedPhoneCountry = (value: string): value is CountryCode =>
  supportedCountries.has(value.toUpperCase() as CountryCode)

const regionFromLocale = (value: string): CountryCode | null => {
  const normalized = value.trim()
  if (!normalized) return null

  try {
    const locale = new Intl.Locale(normalized)
    const region = String(locale.region ?? '').toUpperCase()
    return isSupportedPhoneCountry(region) ? region : null
  } catch {
    const region = normalized.split(/[-_]/).pop()?.toUpperCase() ?? ''
    return isSupportedPhoneCountry(region) ? region : null
  }
}

export const detectPreferredPhoneCountry = (): CountryCode => {
  if (typeof navigator !== 'undefined') {
    const languages = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language]

    for (const language of languages) {
      const region = regionFromLocale(String(language ?? ''))
      if (region) return region
    }
  }

  if (typeof Intl !== 'undefined') {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (timezone) {
      const exactMatch = timezoneCountryMap[timezone]
      if (exactMatch) return exactMatch

      const prefixMatch = Object.entries(timezoneCountryMap).find(([prefix]) => timezone.startsWith(prefix))
      if (prefixMatch) return prefixMatch[1]
    }
  }

  return DEFAULT_PHONE_COUNTRY
}

export const phoneDigits = (value: string): string =>
  String(value ?? '').replace(/\D+/g, '').slice(0, 20)

export const formatNationalPhoneInput = (value: string, country: CountryCode): string => {
  const digits = phoneDigits(value)
  if (!digits) return ''

  return new AsYouType(country).input(digits)
}

export const resolvePhoneCallingCode = (country: CountryCode): string =>
  getCountryCallingCode(country)

export const buildInternationalPhoneValue = (country: CountryCode, nationalValue: string): string => {
  const digits = phoneDigits(nationalValue)
  if (!digits) return ''

  const parsed = parsePhoneNumberFromString(digits, country)
  return parsed?.number ?? `+${getCountryCallingCode(country)}${digits}`
}
