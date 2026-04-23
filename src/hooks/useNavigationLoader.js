import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function useNavigationLoader() {
  const location = useLocation()
  const [navigating, setNavigating] = useState(false)

  useEffect(() => {
    setNavigating(true)
    const timer = setTimeout(() => setNavigating(false), 800) // shorter than initial load
    return () => clearTimeout(timer)
  }, [location.pathname])

  return navigating
}