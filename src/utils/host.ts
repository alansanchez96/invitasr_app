const RESERVED_SUBDOMAINS = new Set(['app', 'api', 'www'])

const normalizeHost = (value: string) =>
  value.trim().toLowerCase().replace(/:\d+$/, '')

const inferPublicBaseDomainFromHost = (rawHost: string): string | null => {
  const host = normalizeHost(rawHost)
  if (!host) return null
  if (host.endsWith('.invitasr.localhost')) return 'invitasr.localhost'
  if (host.endsWith('.invitasr.local')) return 'invitasr.local'
  if (host === 'app.invitasr.localhost') return 'invitasr.localhost'
  if (host === 'app.invitasr.local') return 'invitasr.local'
  return null
}

export const getPublicBaseDomain = (hostValue?: string | null) => {
  const host = typeof hostValue === 'string'
    ? hostValue
    : (typeof window !== 'undefined' ? window.location.hostname : '')
  const normalizedHost = normalizeHost(host)
  const configured = String(import.meta.env.VITE_PUBLIC_BASE_DOMAIN ?? '').trim().toLowerCase()
  if (configured) {
    const hostMatchesConfigured = normalizedHost === `app.${configured}`
      || normalizedHost.endsWith(`.${configured}`)
    if (hostMatchesConfigured || !normalizedHost) {
      return configured
    }
  }

  const inferred = inferPublicBaseDomainFromHost(host)
  if (inferred) return inferred

  return configured || 'invitasr.local'
}

export const resolveInvitationSubdomainFromHost = (hostValue?: string | null): string | null => {
  const rawHost = typeof hostValue === 'string'
    ? hostValue
    : (typeof window !== 'undefined' ? window.location.hostname : '')
  const host = normalizeHost(rawHost)
  if (!host) return null

  const baseDomain = getPublicBaseDomain(host)
  const suffix = `.${baseDomain}`
  if (!host.endsWith(suffix)) return null

  const subdomain = host.slice(0, -suffix.length).trim()
  if (!subdomain || subdomain.includes('.')) return null
  if (RESERVED_SUBDOMAINS.has(subdomain)) return null
  if (!/^(?!-)[a-z0-9]+(?:-[a-z0-9]+)*(?<!-)$/.test(subdomain)) return null

  return subdomain
}

export const isInvitationSubdomainHost = (hostValue?: string | null): boolean =>
  Boolean(resolveInvitationSubdomainFromHost(hostValue))
