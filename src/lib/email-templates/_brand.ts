// Shared brand styles for Travidz auth emails.
// Email clients do not support oklch — these are hex approximations of the
// design tokens in src/styles.css.
export const brand = {
  primary: '#ff5a8a',
  primaryForeground: '#ffffff',
  background: '#fff8f0',
  surface: '#ffffff',
  foreground: '#2a1b3d',
  muted: '#7a6480',
  border: '#f0e4d6',
}

export const main = {
  backgroundColor: brand.background,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  color: brand.foreground,
  margin: 0,
  padding: '32px 0',
}

export const container = {
  backgroundColor: brand.surface,
  border: `1px solid ${brand.border}`,
  borderRadius: '14px',
  padding: '40px 36px',
  maxWidth: '560px',
  margin: '0 auto',
}

export const brandMark = {
  fontSize: '14px',
  fontWeight: 700 as const,
  letterSpacing: '0.18em',
  color: brand.primary,
  textTransform: 'uppercase' as const,
  margin: '0 0 24px',
}

export const h1 = {
  fontSize: '26px',
  fontWeight: 700 as const,
  color: brand.foreground,
  margin: '0 0 16px',
  lineHeight: '1.2',
}

export const text = {
  fontSize: '15px',
  color: brand.foreground,
  lineHeight: '1.6',
  margin: '0 0 20px',
}

export const link = { color: brand.primary, textDecoration: 'underline' }

export const button = {
  backgroundColor: brand.primary,
  color: brand.primaryForeground,
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '8px 0 24px',
}

export const code = {
  display: 'inline-block',
  backgroundColor: brand.background,
  border: `1px solid ${brand.border}`,
  borderRadius: '8px',
  padding: '12px 20px',
  fontFamily: "'SF Mono', Menlo, Monaco, Consolas, monospace",
  fontSize: '20px',
  letterSpacing: '0.25em',
  color: brand.foreground,
  margin: '8px 0 24px',
}

export const footer = {
  fontSize: '12px',
  color: brand.muted,
  lineHeight: '1.5',
  margin: '32px 0 0',
  borderTop: `1px solid ${brand.border}`,
  paddingTop: '20px',
}
