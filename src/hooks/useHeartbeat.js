import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function useHeartbeat() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const sendHeartbeat = async () => {
      console.log("💓 heartbeat")

      const { error } = await supabase
        .from('profiles')
        .update({
          last_seen_at: new Date().toISOString(),
          is_online: true
        })
        .eq('id', user.id)

      if (error) console.error("Heartbeat error:", error)
    }

    // run immediately
    sendHeartbeat()

    // repeat every 15 seconds
    const interval = setInterval(sendHeartbeat, 15000)

    return () => clearInterval(interval)
  }, [user])
}