// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { create } from 'zustand'

// A Supabase client with one table row in memory and a signed-in session.
const db = { row: null, upserts: 0, session: { user: { id: 'u1', email: 'ela@exemplo.com' } } }
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: db.session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.row ? { state: db.row.state } : null, error: null }) }) }),
      upsert: async r => { db.upserts++; db.row = { state: JSON.parse(JSON.stringify(r.state)) }; return { error: null } },
    }),
  }),
}))

vi.stubEnv('VITE_LOCAL_ONLY', '1')
vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
vi.stubEnv('VITE_SUPABASE_KEY', 'sb_publishable_test')

const cloud = await import('./cloud.js')

const workout = (id, ts) => ({ id, date: '2026-10-0' + id.slice(-1), start: ts, end: ts + 1, ex: [], _ts: ts })
const fakeStore = S => create((set, get) => ({
  S,
  replaceState(next) { set({ S: JSON.parse(JSON.stringify(next)) }) },
}))

describe('mergedCopy', () => {
  it('a device with nothing of its own takes the row as it is', async () => {
    const remote = { unit: 'lb', workouts: [workout('w1', 10)], _ts: 10 }
    expect(await cloud.mergedCopy({ unit: 'kg', workouts: [] }, remote)).toBe(remote)
  })
  it('with no row the local copy stands', async () => {
    const local = { workouts: [workout('w1', 10)] }
    expect(await cloud.mergedCopy(local, null)).toBe(local)
  })
  it('keeps the workouts of both copies', async () => {
    const m = await cloud.mergedCopy({ workouts: [workout('w1', 10)], _ts: 10 }, { workouts: [workout('w2', 20)], _ts: 20 })
    expect(m.workouts.map(w => w.id).sort()).toEqual(['w1', 'w2'])
  })
})

describe('sync', () => {
  beforeEach(() => { db.row = null; db.upserts = 0 })

  it('pushes this device’s copy when the account has no row yet, then pulls the other device’s workout in', async () => {
    const store = fakeStore({ workouts: [workout('w1', 10)], _ts: 10 })
    await cloud.startCloud(store)
    await cloud.syncNow()
    expect(db.row.state.workouts.map(w => w.id)).toEqual(['w1'])
    expect(cloud.useCloud.getState()).toMatchObject({ status: 'ok', email: 'ela@exemplo.com' })

    // Another phone logged a workout meanwhile.
    db.row.state = { ...db.row.state, workouts: [...db.row.state.workouts, workout('w2', 20)], _ts: 20 }
    const before = db.upserts
    await cloud.syncNow()
    expect(store.getState().S.workouts.map(w => w.id).sort()).toEqual(['w1', 'w2'])
    // The merge equals the row: nothing to write back.
    expect(db.upserts).toBe(before)
  })
})
