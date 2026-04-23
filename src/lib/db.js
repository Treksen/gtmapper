// src/lib/db.js

const DB_NAME = 'collectAppDB'
const DB_VERSION = 1
const DRAFT_STORE = 'drafts'
const FINALIZED_STORE = 'finalized'

let dbPromise = null

// Open IndexedDB
function openDB() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(FINALIZED_STORE)) {
        db.createObjectStore(FINALIZED_STORE, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

// Save draft
export async function saveDraft(draft) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, 'readwrite')
    const store = tx.objectStore(DRAFT_STORE)
    store.put(draft)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Save finalized form
export async function saveFinalized(form) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FINALIZED_STORE, 'readwrite')
    const store = tx.objectStore(FINALIZED_STORE)
    store.put(form)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Get all drafts
export async function getDrafts() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, 'readonly')
    const store = tx.objectStore(DRAFT_STORE)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Get all finalized forms
export async function getFinalized() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FINALIZED_STORE, 'readonly')
    const store = tx.objectStore(FINALIZED_STORE)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Delete draft or finalized form after sending
export async function deleteItem(storeName, id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Sync finalized forms when online
export async function syncFinalizedForms(submitFunc, onSuccess, onError) {
  const finalized = await getFinalized()
  if (!navigator.onLine || finalized.length === 0) return

  for (const form of finalized) {
    try {
      await submitFunc(form) // your Supabase submission function
      await deleteItem(FINALIZED_STORE, form.id)
      onSuccess?.(form)
    } catch (err) {
      onError?.(form, err)
    }
  }
}