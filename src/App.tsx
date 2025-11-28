import { useState, useEffect } from 'react'
import SearchPage from './components/SearchPage'
import MyJobsPage from './components/MyJobsPage'
import SearchResultsPage from './components/SearchResultsPage'
import BenchmarkDashboard from './components/BenchmarkDashboard'
import MatchingDashboard from './components/MatchingDashboard'
import ChatBot from './components/ChatBot'
import AuthPage from './components/AuthPage'
import { useAuth } from './hooks/useAuth'
import { Loader2 } from 'lucide-react'

type Page = 'Star Catalogue' | 'My Jobs' | 'Analytics' | 'Benchmark' | 'Search Results' | 'Match'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('Star Catalogue')
  const { user, loading } = useAuth()

  useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      const page = event.detail as Page
      setCurrentPage(page)
    }

    window.addEventListener('navigate' as any, handleNavigate)
    return () => {
      window.removeEventListener('navigate' as any, handleNavigate)
    }
  }, [])

  const handleNavigation = (page: Page) => {
    setCurrentPage(page)
  }

  const handleAuthSuccess = () => {
    // Auth state will update automatically via useAuth hook
  }

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a0b2e] via-[#2d1b4e] to-[#1a0b2e] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
      </div>
    )
  }

  // Show auth page if not authenticated
  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />
  }

  // Simple navigation context - in production, use React Router
  if (currentPage === 'My Jobs') {
    return <MyJobsPage onNavigate={handleNavigation} />
  }

  if (currentPage === 'Search Results') {
    return <SearchResultsPage onNavigate={handleNavigation} />
  }

  if (currentPage === 'Star Catalogue') {
    return <SearchPage onNavigate={handleNavigation} />
  }

  if (currentPage === 'Benchmark') {
    return <BenchmarkDashboard />
  }

  if (currentPage === 'Match') {
    return <MatchingDashboard onNavigate={handleNavigation} />
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-[#E8E9EB] via-[#E0E2E5] to-[#E8E9EB] flex items-center justify-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] bg-clip-text text-transparent">
          Analytics Coming Soon
        </h1>
      </div>
      <ChatBot />
    </>
  )
}

export default App

