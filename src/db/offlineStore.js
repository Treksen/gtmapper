// ── src/db/offlineStore.js ────────────────────────────────────────────────────
// IndexedDB wrapper for offline form drafts.
// Stores drafts locally; synced to Supabase when online.

const DB_NAME    = 'gtmapper_offline'
const DB_VERSION = 1
const STORE      = 'form_drafts'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'local_id' })
        store.createIndex('status',  'status',  { unique: false })
        store.createIndex('form_id', 'form_id', { unique: false })
      }
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror   = e => reject(e.target.error)
  })
}

// ── STATUSES ─────────────────────────────────────────────────────────────────
// draft     — being filled in, not submitted
// finalized — filled and ready, waiting for connectivity
// sent      — synced to Supabase successfully
// failed    — sync attempted but failed

export async function saveDraft(draft) {
  // draft must have: local_id, form_id, form_title, data, status, lat, lng, officer_id, org_id
  const db    = await openDB()
  const tx    = db.transaction(STORE, 'readwrite')
  const store = tx.objectStore(STORE)
  const record = {
    ...draft,
    updated_at: new Date().toISOString(),
  }
  store.put(record)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(record)
    tx.onerror    = () => reject(tx.error)
  })
}

export async function getDraft(localId) {
  const db    = await openDB()
  const tx    = db.transaction(STORE, 'readonly')
  const store = tx.objectStore(STORE)
  const req   = store.get(localId)
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || null)
    req.onerror   = () => reject(req.error)
  })
}

export async function getAllDrafts() {
  const db    = await openDB()
  const tx    = db.transaction(STORE, 'readonly')
  const store = tx.objectStore(STORE)
  const req   = store.getAll()
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || [])
    req.onerror   = () => reject(req.error)
  })
}

export async function deleteDraft(localId) {
  const db    = await openDB()
  const tx    = db.transaction(STORE, 'readwrite')
  const store = tx.objectStore(STORE)
  store.delete(localId)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

export async function updateDraftStatus(localId, status, remote_id = null) {
  const draft = await getDraft(localId)
  if (!draft) return
  return saveDraft({ ...draft, status, remote_id, updated_at: new Date().toISOString() })
}

// ── SYNC ENGINE ───────────────────────────────────────────────────────────────
// Call this whenever the app comes online or on app start.
export async function syncPendingDrafts(supabase) {
  const all      = await getAllDrafts()
  const toSync   = all.filter(d => d.status === 'finalized')
  const results  = { synced: 0, failed: 0 }

  for (const draft of toSync) {
    try {
      const { data, error } = await supabase.from('form_submissions').insert({
        form_id:      draft.form_id,
        org_id:       draft.org_id,
        officer_id:   draft.officer_id,
        data:         draft.data,
        lat:          draft.lat,
        lng:          draft.lng,
        status:       'submitted',
        submitted_at: draft.finalized_at || new Date().toISOString(),
      }).select().single()

      if (error) throw error

      await updateDraftStatus(draft.local_id, 'sent', data.id)
      results.synced++
    } catch (err) {
      await updateDraftStatus(draft.local_id, 'failed')
      results.failed++
      console.warn('[offline] sync failed for', draft.local_id, err.message)
    }
  }

  return results
}

export function generateLocalId() {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}
