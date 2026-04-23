import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})
////////////////////////////
// import { useEffect } from "react";
// import { supabase } from "../lib/supabase";

export function usePresence(user) {
  useEffect(() => {
    if (!user) return;

    const updateHeartbeat = async () => {
      console.log("💓 global heartbeat");

      const { error } = await supabase
        .from("profiles")
        .update({
          last_seen_at: new Date().toISOString(),
          is_online: true,
        })
        .eq("id", user.id);

      if (error) console.error(error);
    };

    // run immediately
    updateHeartbeat();

    // repeat
    const interval = setInterval(updateHeartbeat, 15000);

    return () => clearInterval(interval);
  }, [user]);
}
//////////////////
export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null)
  const [profile, setProfile]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [pendingReg, setPendingReg] = useState(null) // registration awaiting approval
  const heartbeatRef                = useRef(null)

  // Keep a ref to the current user ID for the beforeunload handler
  const userIdRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      userIdRef.current = session?.user?.id ?? null
      if (session?.user) await fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        userIdRef.current = session?.user?.id ?? null
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 300)
        } else {
          setProfile(null)
          setPendingReg(null)
          setLoading(false)
          stopHeartbeat()
        }
      }
    )

    // Mark offline immediately when the tab/browser closes
    const handleUnload = () => {
      const uid = userIdRef.current
      if (uid) {
        // navigator.sendBeacon is the only reliable way to fire on unload
        // Fall back to a synchronous XHR if needed; supabase REST works too
        supabase.from('profiles')
          .update({ is_online: false, last_seen_at: new Date().toISOString() })
          .eq('id', uid)
          .then(() => {})
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    // pagehide fires on mobile Safari where beforeunload is unreliable
    window.addEventListener('pagehide', handleUnload)

    return () => {
      subscription.unsubscribe()
      stopHeartbeat()
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('pagehide', handleUnload)
    }
  }, [])

  async function fetchProfile(userId, attempt = 1) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, organisations!profiles_org_id_fkey(name, country)')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        if (attempt < 5) {
          setTimeout(() => fetchProfile(userId, attempt + 1), 800)
          return
        }
        setProfile(null)
        setLoading(false)
        return
      }

      // User is inactive — check if they have a pending registration
      if (!data.active) {
        const { data: pr } = await supabase
          .from('pending_registrations')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
        setPendingReg(pr || { status: 'pending' })
        setProfile(data)
        setLoading(false)
        return
      }

      setProfile(data)
      setPendingReg(null)
      setLoading(false)

      // Mark online
      supabase.from('profiles')
        .update({ is_online: true, last_seen_at: new Date().toISOString() })
        .eq('id', userId)
        .then(() => {})

      startHeartbeat(userId, data.role)
    } catch (err) {
      console.error('Profile fetch error:', err.message)
      setProfile(null)
      setLoading(false)
    }
  }

  function startHeartbeat(userId, role) {
    stopHeartbeat()

    // Helper: update profile heartbeat
    function beat() {
      supabase.from('profiles')
        .update({ last_seen_at: new Date().toISOString(), is_online: true })
        .eq('id', userId)
        .then(() => {})
    }

    // Helper: record GPS location (for supervisors and admins too)
    function recordGPS() {
      if (!navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(pos => {
        supabase.from('officer_locations').insert({
          officer_id:  userId,
          lat:         pos.coords.latitude,
          lng:         pos.coords.longitude,
          accuracy:    Math.round(pos.coords.accuracy),
          status:      'active',
          recorded_at: new Date().toISOString(),
        }).then(() => {})
      }, () => {}, { enableHighAccuracy: true, timeout: 8000 })
    }

    // Fire immediately on login
    beat()
    recordGPS()

    // Then every 30 seconds
    heartbeatRef.current = setInterval(() => {
      beat()
      recordGPS()
    }, 30000)
  }

  function stopHeartbeat() {
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    if (user) {
      await supabase.from('profiles')
        .update({ is_online: false, last_seen_at: new Date().toISOString() })
        .eq('id', user.id)
    }
    stopHeartbeat()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setPendingReg(null)
  }

  async function updateProfile(updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .maybeSingle()
    if (error) throw error
    if (data) setProfile(data)
    return data
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading, pendingReg,
      signIn, signOut, updateProfile,
      refetchProfile: () => user && fetchProfile(user.id),
      isSuperAdmin:  profile?.role === 'super_admin',
      isSupervisor:  profile?.role === 'supervisor',
      isOfficer:     profile?.role === 'officer',
      isApproved:    profile?.active === true,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
