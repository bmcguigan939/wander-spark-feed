import { render } from '@react-email/components'
import type { ReactElement } from 'react'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

export const SITE_NAME = 'Travidz'
export const SENDER_DOMAIN = 'notify.travidz.com'
export const FROM_DOMAIN = 'travidz.com'
export const FROM_ADDRESS = `${SITE_NAME} <noreply@${FROM_DOMAIN}>`
export const SITE_URL = 'https://travidz.com'

export type EmailCategory = 'redemption' | 'expiry' | 'social' | 'applications'

const PREF_COLUMN: Record<EmailCategory, string> = {
  redemption: 'notify_redemption',
  expiry: 'notify_expiry',
  social: 'notify_social',
  applications: 'notify_applications',
}

type EnqueueArgs = {
  to: string
  subject: string
  react: ReactElement
  label: string
  // When provided, we honour the recipient's email_preferences for this category.
  userId?: string | null
  category?: EmailCategory
  idempotencyKey?: string
}

/**
 * Render a React Email component and push it onto the transactional_emails queue.
 * Returns { ok: true, queued: true } on success, { ok: true, skipped: <reason> } when
 * suppressed / opted out, or { ok: false, error } on infrastructure failure.
 * Never throws — callers should not roll back primary writes on email failures.
 */
export async function enqueueTransactionalEmail(args: EnqueueArgs) {
  const to = args.to?.trim().toLowerCase()
  if (!to) return { ok: true as const, skipped: 'no-recipient' as const }

  try {
    // 1. Suppression check (hard block)
    const { data: supp } = await supabaseAdmin
      .from('suppressed_emails')
      .select('email')
      .eq('email', to)
      .maybeSingle()
    if (supp) return { ok: true as const, skipped: 'suppressed' as const }

    // 2. Per-user category preference
    if (args.userId && args.category) {
      const col = PREF_COLUMN[args.category]
      const { data: prefs } = await supabaseAdmin
        .from('email_preferences')
        .select(col)
        .eq('user_id', args.userId)
        .maybeSingle()
      // Default is opt-in; only skip when explicitly false
      const value = prefs ? (prefs as unknown as Record<string, unknown>)[col] : undefined
      if (value === false) {
        return { ok: true as const, skipped: 'opted-out' as const }
      }
    }

    // 3. Render
    const html = await render(args.react)
    const text = await render(args.react, { plainText: true })

    const messageId = crypto.randomUUID()
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: args.label,
      recipient_email: to,
      status: 'pending',
    })

    const { error } = await supabaseAdmin.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to,
        from: FROM_ADDRESS,
        sender_domain: SENDER_DOMAIN,
        subject: args.subject,
        html,
        text,
        purpose: 'transactional',
        label: args.label,
        idempotency_key: args.idempotencyKey,
        queued_at: new Date().toISOString(),
      },
    })
    if (error) {
      await supabaseAdmin.from('email_send_log').insert({
        message_id: messageId,
        template_name: args.label,
        recipient_email: to,
        status: 'failed',
        error_message: `enqueue failed: ${error.message}`,
      })
      return { ok: false as const, error: error.message }
    }
    return { ok: true as const, queued: true as const, messageId }
  } catch (e: any) {
    console.error('enqueueTransactionalEmail failed', e)
    return { ok: false as const, error: String(e?.message ?? e) }
  }
}

/** Resolve the email for a profile id via Supabase Auth Admin. */
export async function getUserEmail(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (error || !data?.user?.email) return null
    return data.user.email
  } catch {
    return null
  }
}

export function formatMoneyGBP(cents: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format((cents ?? 0) / 100)
}