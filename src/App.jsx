import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import TopBar from './components/TopBar'
import Footer from './components/Footer'
import BottomNav from './components/BottomNav'
import ErrorBoundary from './components/ErrorBoundary'
import { DetailSkeleton } from './components/Skeletons'
import { HAS_KEY } from './lib/tmdb'
import Setup from './pages/Setup'
import Home from './pages/Home'
import Browse from './pages/Browse'
import Search from './pages/Search'
import Watchlist from './pages/Watchlist'
import NotFound from './pages/NotFound'

// Halaman berat (detail & player) dimuat terpisah supaya bundle awal tetap ringan.
const Detail = lazy(() => import('./pages/Detail'))
const Watch = lazy(() => import('./pages/Watch'))
// Admin panel (Issue #6) — lazy supaya tidak membebani bundle publik
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const AdminLayout = lazy(() => import('./components/AdminLayout'))
const Admin = lazy(() => import('./pages/Admin'))
const AdminEntry = lazy(() => import('./pages/AdminEntry'))
const AdminSettings = lazy(() => import('./pages/AdminSettings'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  if (!HAS_KEY) return <Setup />

  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppShell />
    </BrowserRouter>
  )
}

function AppShell() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')

  return (
    <>
      {!isAdmin && <TopBar />}
      <ErrorBoundary>
        <main>
          <Suspense fallback={<DetailSkeleton />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/jelajah" element={<Browse />} />
              <Route path="/cari" element={<Search />} />
              <Route path="/judul/:type/:id" element={<Detail />} />
              <Route path="/tonton/:type/:id" element={<Watch />} />
              <Route path="/watchlist" element={<Watchlist />} />
              {/* Admin panel (Issue #6) */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Admin />} />
                <Route path="entry" element={<AdminEntry />} />
                <Route path="entry/:id" element={<AdminEntry />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
      </ErrorBoundary>
      {!isAdmin && <Footer />}
      {!isAdmin && <BottomNav />}
    </>
  )
}
