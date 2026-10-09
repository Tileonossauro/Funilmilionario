// GostoSAH: a static build with no backend and no example data (VITE_LOCAL_ONLY=1). The app stays
// in guest mode — everything in this browser — and the sign-in, sync and self-host UI folds away,
// the same way the demo build's does, minus the demo's seeded history.
export const LOCAL_ONLY = import.meta.env.VITE_LOCAL_ONLY === '1'
