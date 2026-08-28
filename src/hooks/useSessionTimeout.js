import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import config from '@/config'
import { useAuthStore } from '@/stores/authStore'

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove']
const DEBOUNCE_MS = 1000

export function useSessionTimeout() {
  const navigate = useNavigate()
  const timerRef = useRef(null)
  const lastActivityRef = useRef(0)
  const timeoutMs = config.auth.sessionTimeout

  useEffect(() => {
    if (!timeoutMs || timeoutMs <= 0) return

    lastActivityRef.current = Date.now()

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    const resetTimer = () => {
      clearTimer()
      timerRef.current = setTimeout(() => {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        localStorage.removeItem('refresh_token')
        useAuthStore.getState().setUnauthenticated()
        navigate('/login', { replace: true })
      }, timeoutMs)
    }

    const handleActivity = () => {
      const now = Date.now()
      if (now - lastActivityRef.current < DEBOUNCE_MS) return
      lastActivityRef.current = now
      resetTimer()
    }

    resetTimer()

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true })
    }

    return () => {
      clearTimer()
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity)
      }
    }
  }, [navigate, timeoutMs])
}
