// GostoSAH cloud save (Supabase). Only in the local-only build, and only when the build carries a
// project (VITE_SUPABASE_URL + VITE_SUPABASE_KEY): the app stays a guest app that keeps everything
// in this browser, and a signed-in account also keeps one copy of the whole state in the
// `gostosah_state` table (one row per account, row-level security: each account reads and writes
// its own row only).
//
// Every sync reads the row, merges it with this device's copy (mergeStates — the same field-by-
// field merge two devices of an openGym account get), puts the merge on screen if it differs and
// writes it back if the row differs. So a phone that was offline, or a second device, never
// overwrites what the other logged.
import { create } from 'zustand'
import { LOCAL_ONLY } from './local-only.js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_KEY
export const CLOUD = LOCAL_ONLY && !!URL && !!KEY
const TABLE = 'gostosah_state'
const PUSH_DELAY = 2500

// What the screens show: who is signed in and how the last sync went.
// status: 'off' (signed out) | 'syncing' | 'ok' | 'offline' | 'error'
export const useCloud = create(() => ({ ready: !CLOUD, email: null, status: 'off', lastSynced: 0, error: null, recovering: false }))

let client = null
let store = null
let applying = false
let running = null
let again = false
let timer = null

async function supabase() {
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js')
    client = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'gostosah_auth' } })
  }
  return client
}

const hasData = st => !!((st?.workouts || []).length || (st?.routines || []).length || (st?.bodyweight || []).length || (st?.customEx || []).length)
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// The local copy and the row → what both should hold. A device joining the account with nothing
// of its own yet (a new phone, a cleared browser) takes the row as it is: its untouched defaults
// must not win over settings chosen on the other device. Once it has synced with the account,
// every later sync merges, so a setting changed here before any workout is logged is kept.
export async function mergedCopy(local, remote, joined = true) {
  if (!remote) return local
  if (!joined && !hasData(local)) return remote
  const { mergeStates } = await import('./sync-merge.js')
  return mergeStates(local, remote)
}

// Which account this browser's copy last synced with (one per device).
const JOINED_KEY = 'gostosah_synced_uid'
const joinedWith = uid => { try { return localStorage.getItem(JOINED_KEY) === uid } catch { return false } }
const markJoined = uid => { try { localStorage.setItem(JOINED_KEY, uid) } catch { /* ignore */ } }

async function syncOnce() {
  const sb = await supabase()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) { useCloud.setState({ status: 'off', email: null }); return }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { useCloud.setState({ status: 'offline' }); return }
  useCloud.setState({ status: 'syncing', email: session.user.email, error: null })
  const { data: row, error } = await sb.from(TABLE).select('state').eq('user_id', session.user.id).maybeSingle()
  if (error) throw error
  const local = store.getState().S
  const merged = await mergedCopy(local, row?.state || null, joinedWith(session.user.id))
  if (!same(merged, local)) {
    applying = true
    try { store.getState().replaceState(merged, false) } finally { applying = false }
  }
  if (!row || !same(merged, row.state)) {
    const { error: e } = await sb.from(TABLE).upsert({ user_id: session.user.id, state: store.getState().S })
    if (e) throw e
  }
  markJoined(session.user.id)
  useCloud.setState({ status: 'ok', lastSynced: Date.now(), error: null })
}

// One sync at a time; a request while one runs queues exactly one more after it.
export function syncNow() {
  if (!CLOUD) return Promise.resolve()
  clearTimeout(timer)
  if (running) { again = true; return running }
  running = (async () => {
    try {
      do { again = false; await syncOnce() } while (again)
    } catch (e) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false
      useCloud.setState({ status: offline ? 'offline' : 'error', error: e?.message || String(e) })
    } finally { running = null }
  })()
  return running
}

const schedule = () => { clearTimeout(timer); timer = setTimeout(syncNow, PUSH_DELAY) }

export async function startCloud(useStore) {
  if (!CLOUD || store) return
  store = useStore
  const sb = await supabase()
  const { data: { session } } = await sb.auth.getSession()
  useCloud.setState({ ready: true, email: session?.user?.email || null, status: session ? 'syncing' : 'off' })
  sb.auth.onAuthStateChange((event, s) => {
    useCloud.setState({ email: s?.user?.email || null, ...(s ? {} : { status: 'off' }) })
    if (event === 'SIGNED_IN') syncNow()
    // Opened from the "reset password" e-mail: signed in, and the screens ask for a new one.
    if (event === 'PASSWORD_RECOVERY') useCloud.setState({ recovering: true })
  })
  // Every change on this device, a little after the last one; not the merge this module applied.
  useStore.subscribe((st, prev) => { if (st.S !== prev.S && !applying) schedule() })
  // Back in the app, or back online: the other device may have written since.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow() })
  window.addEventListener('online', () => syncNow())
  if (session) syncNow()
}

export async function signIn(email, password) {
  const sb = await supabase()
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
}

// Returns true when the account is in at once, false when the project wants the e-mail confirmed
// first (the link brings the person back here, signed in). The GostoSAH project confirms every
// new account in the database (migration auto_confirm_signups), so a sign-up that came back
// without a session can sign in right away.
export async function signUp(email, password) {
  const sb = await supabase()
  const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: location.origin + location.pathname } })
  if (error) throw error
  if (data.session) return true
  const { error: e } = await sb.auth.signInWithPassword({ email: email.trim(), password })
  return !e
}

export async function resetPassword(email) {
  const sb = await supabase()
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + location.pathname })
  if (error) throw error
}

export async function updatePassword(password) {
  const sb = await supabase()
  const { error } = await sb.auth.updateUser({ password })
  if (error) throw error
}

// Signing out keeps this phone's copy: it is the person's own data on their own device.
export async function signOut() {
  await syncNow()
  const sb = await supabase()
  await sb.auth.signOut()
  useCloud.setState({ status: 'off', email: null, lastSynced: 0 })
}

// Supabase's English auth errors, in the app's language.
export function cloudError(e) {
  const m = String(e?.message || e || '')
  if (/invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.'
  if (/email not confirmed/i.test(m)) return 'Confirme seu e-mail primeiro: abra o link que chegou na sua caixa de entrada.'
  if (/already registered|already exists/i.test(m)) return 'Esse e-mail já tem conta. Use "Entrar".'
  if (/password should be at least|weak password/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/rate limit|too many/i.test(m)) return 'Muitas tentativas. Espere um pouco e tente de novo.'
  if (/invalid.*email|unable to validate email/i.test(m)) return 'Esse e-mail não parece certo.'
  if (/failed to fetch|network/i.test(m)) return 'Sem conexão. Tente de novo quando estiver online.'
  return m || 'Algo deu errado.'
}
