import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
// import { makeChannel, chName } from '../utils/realtime'
// ── Unique channel name helper (avoids StrictMode double-subscribe crash) ─────
let _chSeq = 0
function chName(base) { return `${base}-${++_chSeq}` }

// ── Safe realtime subscription: .on() BEFORE .subscribe() ─────────────────────
function makeChannel(name, table, callback) {
  const ch = supabase.channel(name)
  ch.on('postgres_changes', { event: '*', schema: 'public', table }, callback)
  ch.subscribe()
  return ch
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([])
  const add = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])
  return { toasts, toast: add }
}

// ── ZONES ─────────────────────────────────────────────────────────────────────
export function getOfficerStatus(officer) {
  const { is_online, last_seen_at } = officer
  if (!last_seen_at) return 'offline'
  const minsAgo = (Date.now() - new Date(last_seen_at)) / 60000
  if (is_online && minsAgo < 5)  return 'active'
  if (minsAgo < 30)              return 'inactive'
  return 'offline'
}

// ── OFFICERS ──────────────────────────────────────────────────────────────────
export function useOfficers(orgId) {
  const { profile } = useAuth()
  const oid = orgId || profile?.org_id
  const [officers, setOfficers] = useState([])
  const [loading, setLoading]   = useState(true)
  const fetchRef = useRef(null)

  const fetch = useCallback(async () => {
    if (!oid) return
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        organisations!profiles_org_id_fkey(name),
        officer_locations(lat, lng, status, recorded_at)
      `)
      .eq('org_id', oid)
      .in('role', ['officer', 'supervisor'])
      .eq('active', true)
      .order('full_name')
    if (error) console.error('useOfficers error:', error)
    setOfficers(data || []); setLoading(false)
  }, [oid])

  fetchRef.current = fetch
  useEffect(() => { fetch() }, [fetch])

  // Subscribe to both officer_locations AND profiles (for is_online / last_seen_at)
  useEffect(() => {
    if (!oid) return
    const ch1 = makeChannel(chName('officer-locs'),     'officer_locations', () => fetchRef.current?.())
    const ch2 = makeChannel(chName('officer-profiles'), 'profiles',          () => fetchRef.current?.())
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
  }, [oid])

  return { officers, loading, refetch: fetch }
}

// ── ALL ORG MEMBERS ───────────────────────────────────────────────────────────
export function useOrgMembers(orgId) {
  const { profile } = useAuth()
  const oid = orgId || profile?.org_id
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    if (!oid) return
    const { data } = await supabase.from('profiles').select('*, organisations!profiles_org_id_fkey(name)').eq('org_id', oid).order('full_name')
    setMembers(data || []); setLoading(false)
  }, [oid])
  useEffect(() => { fetch() }, [fetch])
  return { members, loading, refetch: fetch }
}

export async function updateOfficerLocation(officerId, lat, lng, accuracy) {
  await supabase.from('officer_locations').insert({
    officer_id: officerId, lat, lng, accuracy,
    status: 'active', recorded_at: new Date().toISOString()
  })
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
export function useNotifications() {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)
  const fetchRef = useRef(null)

  const fetch = useCallback(async () => {
    if (!profile?.org_id) return
    const { data } = await supabase.from('notifications').select('*').eq('org_id', profile.org_id).order('created_at', { ascending: false }).limit(50)
    setNotifications(data || []); setLoading(false)
  }, [profile?.org_id])

  fetchRef.current = fetch
  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!profile?.org_id) return
    const ch = makeChannel(chName('notifs'), 'notifications', () => fetchRef.current?.())
    return () => supabase.removeChannel(ch)
  }, [profile?.org_id])

  async function markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x))
  }
  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('org_id', profile.org_id).eq('read', false)
    setNotifications(n => n.map(x => ({ ...x, read: true })))
  }
  const unread = notifications.filter(n => !n.read).length
  return { notifications, loading, unread, markRead, markAllRead, refetch: fetch }
}

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────
export function useAnnouncements() {
  const { profile } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  useEffect(() => {
    if (!profile?.org_id) return
    supabase.from('announcements').select('*, profiles(full_name)').eq('org_id', profile.org_id).eq('active', true).order('created_at', { ascending: false }).limit(5).then(({ data }) => setAnnouncements(data || []))
  }, [profile?.org_id])
  return { announcements }
}

// ── DASHBOARD STATS ───────────────────────────────────────────────────────────
export function useDashboardStats() {
  const { profile } = useAuth()
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const fetchRef = useRef(null)

  const fetch = useCallback(async () => {
    if (!profile?.org_id) return
    const cutoff5m = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const { data: officersData, count: officerCount } = await supabase
      .from('profiles')
      .select('id, full_name, is_online, last_seen_at', { count: 'exact' })
      .eq('org_id', profile.org_id)
      .in('role', ['officer', 'supervisor'])
      .eq('active', true)

    const officers    = officersData || []
    const activeCount = officers.filter(o =>
      o.is_online === true && o.last_seen_at && new Date(o.last_seen_at) > new Date(cutoff5m)
    ).length

    setStats({
      totalOfficers:  officerCount || 0,
      activeOfficers: activeCount,
      officers,
    })
    setLoading(false)
  }, [profile?.org_id])

  fetchRef.current = fetch
  useEffect(() => { fetch() }, [fetch])

  // Refresh every 30s (matches heartbeat interval) and on profile changes
  useEffect(() => {
    if (!profile?.org_id) return
    const interval = setInterval(() => fetchRef.current?.(), 30000)
    const ch = makeChannel(chName('dash-profiles'), 'profiles', () => fetchRef.current?.())
    return () => { clearInterval(interval); supabase.removeChannel(ch) }
  }, [profile?.org_id])

  return { stats, loading }
}

export function useWeeklyData() {
  const { profile } = useAuth()
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.org_id) return

    async function load() {
      const days = []

      // Generate last 7 days (YYYY-MM-DD)
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        days.push(d.toISOString().split('T')[0])
      }

      // ✅ Fetch submissions instead of visits
const { data: submissions } = await supabase
  .from('form_submissions')
  .select('submitted_at')
  .eq('org_id', profile.org_id)
  .gte('submitted_at', days[0])

      // Initialize counts
      const counts = {}
      days.forEach(d => { counts[d] = 0 })

      // Count submissions per day
      submissions?.forEach(s => {
        const subDate = new Date(s.submitted_at).toISOString().split('T')[0]
        if (counts[subDate] !== undefined) {
          counts[subDate]++
        }
      })

      // Format for chart
      setData(
        days.map(d => ({
          day:         new Date(d).toLocaleDateString('en-KE', { weekday: 'short' }),
          submissions: counts[d],
          date:        d,
        }))
      )

      setLoading(false)
    }

    load()
  }, [profile?.org_id])

  return { data, loading }
}

// ── ORGANISATIONS ─────────────────────────────────────────────────────────────
export function useOrganisations() {
  const [orgs, setOrgs]       = useState([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    const { data } = await supabase.from('organisations').select('*').order('created_at', { ascending: false })
    setOrgs(data || []); setLoading(false)
  }, [])
  useEffect(() => { fetch() }, [fetch])
  return { orgs, loading, refetch: fetch }
}

// ── PENDING ACTIONS ───────────────────────────────────────────────────────────
export function usePendingActions(orgId) {
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const fetchRef = useRef(null)

  const fetch = useCallback(async () => {
    let q = supabase
      .from('pending_actions')
      .select('*, profiles!pending_actions_requested_by_fkey(full_name, role), organisations(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (orgId) q = q.eq('org_id', orgId)
    const { data } = await q
    setActions(data || []); setLoading(false)
  }, [orgId])

  fetchRef.current = fetch
  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    const ch = makeChannel(chName('pending-actions'), 'pending_actions', () => fetchRef.current?.())
    return () => supabase.removeChannel(ch)
  }, [orgId])

  return { actions, loading, refetch: fetch }
}

// ── AUDIT LOG ─────────────────────────────────────────────────────────────────
export function useAuditLog(orgId, limit = 1000) {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const fetchRef = useRef(null)

  const fetch = useCallback(async () => {
    let q = supabase
      .from('audit_log')
      .select('*, profiles(full_name, role), organisations(name)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (orgId) q = q.eq('org_id', orgId)
    const { data, error } = await q
    if (error) console.error('useAuditLog error:', error)
    setLogs(data || []); setLoading(false)
  }, [orgId, limit])

  fetchRef.current = fetch
  useEffect(() => { fetch() }, [fetch])

  // Real-time: new audit entries appear instantly
  useEffect(() => {
    const ch = makeChannel(chName('audit-log'), 'audit_log', () => fetchRef.current?.())
    return () => supabase.removeChannel(ch)
  }, [orgId])

  return { logs, loading, refetch: fetch }
}

// ── FORMS ─────────────────────────────────────────────────────────────────────
export function useForms(orgId, statusFilter) {
  const { profile } = useAuth()
  const oid = orgId || profile?.org_id
  const [forms, setForms]     = useState([])
  const [loading, setLoading] = useState(true)
  const fetchRef = useRef(null)

  const fetch = useCallback(async () => {
    if (!oid) return
    // Use explicit FK hint for the profiles join (created_by → profiles)
    let q = supabase
      .from('forms')
      .select('*, profiles!forms_created_by_fkey(full_name)')
      .eq('org_id', oid)
      .order('created_at', { ascending: false })
    if (statusFilter) q = q.eq('status', statusFilter)
    const { data, error } = await q
    if (error) console.error('useForms error:', error)
    setForms(data || []); setLoading(false)
  }, [oid, statusFilter])

  fetchRef.current = fetch
  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!oid) return
    const ch = makeChannel(chName('forms'), 'forms', () => fetchRef.current?.())
    return () => supabase.removeChannel(ch)
  }, [oid])

  return { forms, loading, refetch: fetch }
}

export function useActiveForms() {
  const { profile } = useAuth()
  const [forms, setForms]     = useState([])
  const [loading, setLoading] = useState(true)
  const fetchRef = useRef(null)

  const fetch = useCallback(async () => {
    if (!profile?.org_id) return
    const { data } = await supabase.from('forms').select('*').eq('org_id', profile.org_id).eq('status', 'approved').eq('active', true).order('created_at', { ascending: false })
    setForms(data || []); setLoading(false)
  }, [profile?.org_id])

  fetchRef.current = fetch
  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!profile?.org_id) return
    const ch = makeChannel(chName('active-forms'), 'forms', () => fetchRef.current?.())
    return () => supabase.removeChannel(ch)
  }, [profile?.org_id])

  return { forms, loading }
}

// ── FORM SUBMISSIONS ──────────────────────────────────────────────────────────
export function useFormSubmissions(formId) {
  const { profile } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading]         = useState(true)
  const fetch = useCallback(async () => {
    if (!formId || !profile?.org_id) return
    const { data } = await supabase.from('form_submissions').select('*, profiles!form_submissions_officer_id_fkey(full_name)').eq('form_id', formId).order('submitted_at', { ascending: false })
    setSubmissions(data || []); setLoading(false)
  }, [formId, profile?.org_id])
  useEffect(() => { fetch() }, [fetch])
  return { submissions, loading, refetch: fetch }
}

export function useMySubmissions() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading]         = useState(true)
  const fetchRef = useRef(null)

  const fetch = useCallback(async () => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from('form_submissions')
      .select('id, form_id, officer_id, data, lat, lng, status, submitted_at, created_at')
      .eq('officer_id', user.id)
      .order('submitted_at', { ascending: false })

    if (error) { console.error('useMySubmissions error:', error); setLoading(false); return }

    // Fetch form titles separately
    const formIds = [...new Set((data || []).map(s => s.form_id))]
    let formTitles = {}
    if (formIds.length > 0) {
      const { data: formsData } = await supabase
        .from('forms').select('id, title').in('id', formIds)
      ;(formsData || []).forEach(f => { formTitles[f.id] = f.title })
    }

    const merged = (data || []).map(s => ({
      ...s,
      form_title: formTitles[s.form_id] || 'Untitled Form',
      forms: { title: formTitles[s.form_id] || 'Untitled Form' },
    }))

    setSubmissions(merged)
    setLoading(false)
  }, [user?.id])

  fetchRef.current = fetch
  useEffect(() => { fetch() }, [fetch])

  // Real-time: refresh when new submissions arrive for this officer
  useEffect(() => {
    if (!user?.id) return
    const ch = makeChannel(chName('my-submissions'), 'form_submissions', () => fetchRef.current?.())
    return () => supabase.removeChannel(ch)
  }, [user?.id])

  return { submissions, loading, refetch: fetch }
}

// ── ALL ORG FORM SUBMISSIONS (for supervisor) ──────────────────────────────────
export function useOrgSubmissions() {
  const { profile } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading]         = useState(true)
  const fetchRef = useRef(null)

  const fetch = useCallback(async () => {
    if (!profile?.org_id) return
    // Fetch submissions + related profile/zone names
    // Note: we select forms separately because the forms RLS join can silently return null
    const { data, error } = await supabase
      .from('form_submissions')
      .select(`
        id, form_id, org_id, officer_id,
        data, lat, lng, status, submitted_at, created_at,
        profiles!form_submissions_officer_id_fkey(full_name)
      `)
      .eq('org_id', profile.org_id)
      .order('submitted_at', { ascending: false })

    if (error) { console.error('useOrgSubmissions error:', error); setLoading(false); return }

    // Fetch form titles in a second query (avoids RLS join silently returning null)
    const formIds = [...new Set((data || []).map(s => s.form_id))]
    let formTitles = {}
    if (formIds.length > 0) {
      const { data: formsData } = await supabase
        .from('forms')
        .select('id, title')
        .in('id', formIds)
      ;(formsData || []).forEach(f => { formTitles[f.id] = f.title })
    }

    // Merge form titles into submissions
    const merged = (data || []).map(s => ({
      ...s,
      forms: { title: formTitles[s.form_id] || 'Untitled Form' },
    }))

    setSubmissions(merged)
    setLoading(false)
  }, [profile?.org_id])

  fetchRef.current = fetch
  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!profile?.org_id) return
    const ch = makeChannel(chName('org-submissions'), 'form_submissions', () => fetchRef.current?.())
    return () => supabase.removeChannel(ch)
  }, [profile?.org_id])

  return { submissions, loading, refetch: fetch }
}
///ADDED
// import { useState, useEffect } from 'react'
// import { supabase } from '../lib/supabase'

export function useMySentForms(orgId, officerId) {
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId || !officerId) return
    setLoading(true)
    supabase
      .from('form_submissions')
      .select('*, forms:form_id(*)')
      .eq('org_id', orgId)
      .eq('officer_id', officerId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setForms(data)
        setLoading(false)
      })
  }, [orgId, officerId])

  return { forms, loading }
}

// src/lib/drafts.js

// ── PRESENCE ──────────────────────────────────────────────────────────────────
// import { useState, useEffect, useCallback, useRef } from 'react'
// import { supabase } from '../lib/supabase'
// import { makeChannel, chName } from '../lib/realtime'

export function usePresence() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const fetchRef = useRef(null)

  const fetch = useCallback(async () => {
    setLoading(true)

    // 1️⃣ Fetch users
    const { data: usersData, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, role, last_seen_at, is_online, org_id')
      .order('id', { ascending: true })

    if (usersError) {
      console.error("Error fetching users:", usersError)
    }

    // 2️⃣ Fetch organisations
    const { data: orgsData, error: orgsError } = await supabase
      .from('organisations')
      .select('id, name')

    if (orgsError) {
      console.error("Error fetching organisations:", orgsError)
    }

    // 3️⃣ Make sure orgsData is an array
    const orgArray = Array.isArray(orgsData) ? orgsData : []

    // 4️⃣ Map org_id to org name
    const orgMap = {}
    orgArray.forEach(org => {
      orgMap[org.id] = org.name
    })

    // 5️⃣ Merge org name into users, compute real online status from heartbeat
    const cutoff5m = new Date(Date.now() - 5 * 60 * 1000)
    const mappedUsers = (Array.isArray(usersData) ? usersData : []).map(u => ({
      ...u,
      role: u.role || 'officer',
      organisationName: u.org_id ? orgMap[u.org_id] || '—' : '—',
      // is_online is true only if heartbeat fired within last 5 minutes
      is_online: u.is_online === true && u.last_seen_at && new Date(u.last_seen_at) > cutoff5m,
    }))

    setUsers(mappedUsers)
    setLoading(false)
  }, [])

  fetchRef.current = fetch

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    const ch = makeChannel(chName('presence'), 'profiles', () => fetchRef.current?.())
    return () => supabase.removeChannel(ch)
  }, [])

  return { users, loading, refetch: fetch }
}

// ── PLATFORM STATS ────────────────────────────────────────────────────────────
export function usePlatformStats() {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const [orgsRes, usersRes, subsRes, pendingRes] = await Promise.all([
        supabase.from('organisations').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id, is_online', { count: 'exact' }),
        supabase.from('form_submissions').select('id', { count: 'exact' })
          .gte('submitted_at', today),
        supabase.from('pending_actions').select('id', { count: 'exact' }).eq('status', 'pending'),
      ])
      setStats({
        totalOrgs:        orgsRes.count  || 0,
        totalUsers:       usersRes.count || 0,
        onlineUsers:      usersRes.data?.filter(u => u.is_online).length || 0,
        submissionsToday: subsRes.count  || 0,
        pendingCount:     pendingRes.count || 0,
      })
      setLoading(false)
    }
    load()
  }, [])
  return { stats, loading }
}

// ── DRAFTS (OFFLINE FORM HELPERS) ─────────────────────────────────────────────
const DRAFT_KEY = 'gtmapper_drafts'

export function getDrafts() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveDraft(draft) {
  const drafts = getDrafts()
  const idx = drafts.findIndex(d => d.id === draft.id)
  if (idx >= 0) drafts[idx] = draft
  else drafts.push(draft)
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts))
}

export function deleteDraft(id) {
  const drafts = getDrafts().filter(d => d.id !== id)
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts))
}

export function markDraftSynced(id) {
  const drafts = getDrafts().map(d =>
    d.id === id ? { ...d, status: 'synced' } : d
  )
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts))
}

// ── WRITE HELPERS (EXISTING) ─────────────────────────────────────────────────
export async function proposePendingAction(orgId, requestedBy, actionType, targetTable, targetId, payload) {
  const { error } = await supabase.from('pending_actions').insert({
    org_id: orgId,
    requested_by: requestedBy,
    action_type: actionType,
    target_table: targetTable,
    target_id: targetId,
    payload,
    status: 'pending',
  })
  if (error) throw error
}

export async function writeAuditLog(actorId, actorRole, eventType, targetTable, targetId, details, orgId) {
  await supabase.from('audit_log').insert({
    actor_id: actorId,
    actor_role: actorRole,
    event_type: eventType,
    target_table: targetTable,
    target_id: targetId,
    details,
    org_id: orgId,
  })
}
