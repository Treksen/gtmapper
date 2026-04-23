// ── src/utils/realtime.js ────────────────────────────────────────────────

// Returns a unique channel name for a table/event type
export function chName(prefix) {
  return `${prefix}-${Date.now()}` // simple unique channel name
}

// Creates a Realtime channel for a Supabase table
export function makeChannel(name, table, callback) {
  const ch = supabase
    .channel(name)
    .on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
      callback?.(payload)
    })
    .subscribe()
  return ch
}