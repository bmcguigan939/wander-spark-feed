import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

type State =
  | { kind: "loading" }
  | { kind: "invalid"; message: string }
  | { kind: "ready"; email: string }
  | { kind: "already"; email: string }
  | { kind: "submitting"; email: string }
  | { kind: "done"; email: string }
  | { kind: "error"; message: string }

function UnsubscribePage() {
  const search = Route.useSearch()
  const token = (search.token ?? "").trim()
  const [state, setState] = useState<State>({ kind: "loading" })

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setState({ kind: "invalid", message: "Missing unsubscribe token." })
      return
    }
    fetch(`/lovable/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          valid?: boolean
          email?: string
          used?: boolean
          error?: string
        }
        if (cancelled) return
        if (!res.ok || !data.valid || !data.email) {
          setState({
            kind: "invalid",
            message: data.error ?? "This unsubscribe link is no longer valid.",
          })
          return
        }
        setState(
          data.used
            ? { kind: "already", email: data.email }
            : { kind: "ready", email: data.email }
        )
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            kind: "error",
            message: "We couldn't reach the server. Please try again.",
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const onConfirm = async () => {
    if (state.kind !== "ready") return
    const email = state.email
    setState({ kind: "submitting", email })
    try {
      const res = await fetch(`/lovable/email/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
      }
      if (!res.ok || !data.ok) {
        setState({
          kind: "error",
          message: data.error ?? "Could not complete unsubscribe.",
        })
        return
      }
      setState({ kind: "done", email })
    } catch {
      setState({
        kind: "error",
        message: "We couldn't reach the server. Please try again.",
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Travidz email preferences
        </h1>

        {state.kind === "loading" && (
          <p className="text-muted-foreground">Checking your link…</p>
        )}

        {state.kind === "invalid" && (
          <p className="text-muted-foreground">{state.message}</p>
        )}

        {state.kind === "error" && (
          <p className="text-destructive">{state.message}</p>
        )}

        {state.kind === "already" && (
          <>
            <p className="text-muted-foreground mb-2">
              <span className="text-foreground font-medium">{state.email}</span>{" "}
              is already unsubscribed.
            </p>
            <p className="text-sm text-muted-foreground">
              You won't receive any more transactional emails from Travidz at
              this address.
            </p>
          </>
        )}

        {(state.kind === "ready" || state.kind === "submitting") && (
          <>
            <p className="text-muted-foreground mb-6">
              Unsubscribe{" "}
              <span className="text-foreground font-medium">{state.email}</span>{" "}
              from Travidz emails?
            </p>
            <Button
              onClick={onConfirm}
              disabled={state.kind === "submitting"}
              className="w-full"
            >
              {state.kind === "submitting"
                ? "Unsubscribing…"
                : "Confirm unsubscribe"}
            </Button>
          </>
        )}

        {state.kind === "done" && (
          <>
            <p className="text-foreground font-medium mb-2">You're unsubscribed.</p>
            <p className="text-sm text-muted-foreground">
              {state.email} will no longer receive Travidz emails.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export const Route = createFileRoute("/email/unsubscribe")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: UnsubscribePage,
})