import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchLiveSport } from '../api'
import Footer from './Footer'

// Root view: asks the server which sport is currently live (falling back to the
// default) and redirects there. Purely a router hop — shows a brief loader.
export default function LiveLanding() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    fetchLiveSport()
      .then(({ slug }) => { if (!cancelled && slug) navigate(`/${slug}`, { replace: true }) })
      .catch(() => { if (!cancelled) navigate('/wc2026', { replace: true }) })
    return () => { cancelled = true }
  }, [navigate])

  return (
    <div className="app">
      <div className="loading">Finding what's live…</div>
      <Footer />
    </div>
  )
}
