import { registerSessionHandlers, setAccessToken } from '@/lib/apiClient'
import { useAuthSessionStore } from './stores/auth-session.store'
import { authApi } from './api/auth.api'

// ---------------------------------------------------------------------------
// initAuthSession
// ---------------------------------------------------------------------------
// Wires the auth feature's session store into apiClient's session handler
// hooks. Call this ONCE before the app renders — in app/providers.tsx.
//
// This is the correct direction of dependency: the feature reaches into lib/,
// not the other way around. apiClient stays genuinely lib/-only.

export function initAuthSession(): void {
  registerSessionHandlers({
    onTokenRefreshed: (token, expiresAtUtc, mustChangePassword) =>
      useAuthSessionStore.getState().setSession(token, expiresAtUtc, mustChangePassword),
    onSessionExpired: () => useAuthSessionStore.getState().clearSession(),
  })
}

// ---------------------------------------------------------------------------
// tryRestoreSession
// ---------------------------------------------------------------------------
// Attempts a silent token refresh on app load using the httpOnly refresh cookie.
// Call this ONCE in app/providers.tsx and await it before rendering the router.
//
// Why this is needed:
//   isAuthenticated in the Zustand store is in-memory only — it resets to false
//   on every page refresh. Without this, a user with a valid refresh cookie would
//   appear logged out on every hard refresh until they happened to trigger a
//   protected request that 401s and kicks the interceptor into action.
//   That's fragile and produces a confusing redirect-to-login flash.
//
// If the refresh fails (no cookie, expired, revoked), we silently swallow the
// error — the user genuinely isn't logged in. Nothing to do.

export async function tryRestoreSession(): Promise<void> {
  try {
    const data = await authApi.refresh()
    useAuthSessionStore
      .getState()
      .setSession(data.accessToken, data.accessTokenExpiresAtUtc, data.mustChangePassword)
  } catch {
    // No valid cookie — not an error condition. The user will see /login.
    setAccessToken(null)
  }
}
