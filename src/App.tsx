import { useEffect, useState } from 'react'
import SearchPage from './components/SearchPage'
import AuthPage from './components/AuthPage'
import MyJobsPage from './components/MyJobsPage'
import BenchmarkDashboard from './components/BenchmarkDashboard'
import Header from './components/Header'
import HeroSection from './components/HeroSection'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './hooks/useAuth'
import galaxyBg from '../images/logo/galaxy.jpg'

type Page = 'Star Catalogue' | 'My Jobs' | 'Analytics' | 'Benchmark'

function App() {
  const { user, loading } = useAuth()
  const [isInitializing, setIsInitializing] = useState(true)
  
  // Load current page from localStorage or default to 'Star Catalogue'
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const savedPage = localStorage.getItem('currentPage') as Page
    return savedPage || 'Star Catalogue'
  })

  // Auto-login with permanent credentials
  useEffect(() => {
    const autoLogin = async () => {
      try {
        // Check if user is already logged in
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session || !session.user) {
          // Auto-login with permanent credentials
          console.log('Auto-logging in with permanent credentials...')
          const { data, error } = await supabase.auth.signInWithPassword({
            email: 'admin@go-offer.us',
            password: 'SuperStar',
          })

          if (error) {
            console.error('Auto-login error:', error)
            // If login fails, show auth page
            setIsInitializing(false)
          } else if (data.user) {
            console.log('Auto-login successful')
            setIsInitializing(false)
          }
        } else {
          // User is already logged in
          setIsInitializing(false)
        }
      } catch (error) {
        console.error('Auto-login initialization error:', error)
        setIsInitializing(false)
      }
    }

    autoLogin()
  }, [])

  // Handle navigation events from Header and save to localStorage
  useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      const page = event.detail as Page
      if (page) {
        setCurrentPage(page)
        localStorage.setItem('currentPage', page)
      }
    }

    window.addEventListener('navigate', handleNavigate as EventListener)
    
    return () => {
      window.removeEventListener('navigate', handleNavigate as EventListener)
    }
  }, [])

  // Show loading state during initialization
  if (isInitializing || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a0b2e] via-[#2d1b4e] to-[#1a0b2e] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  // Show auth page if user is not logged in
  if (!user) {
    return <AuthPage onAuthSuccess={() => {}} />
  }

  // Render page based on current navigation state
  const renderPage = () => {
    switch (currentPage) {
      case 'Star Catalogue':
        return <SearchPage hideHeader />
      case 'My Jobs':
        return <MyJobsPage onNavigate={(page) => { setCurrentPage(page); localStorage.setItem('currentPage', page) }} hideHeader />
      case 'Benchmark':
        return <BenchmarkDashboard hideHeader />
      case 'Analytics':
        // Placeholder for Analytics page
        return (
          <div className="min-h-screen bg-gradient-to-br from-[#E8E9EB] via-[#E0E2E5] to-[#E8E9EB]">
            <div className="relative w-full" style={{
              backgroundImage: `url(${galaxyBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              filter: 'contrast(1.15) saturate(1.1)',
            }}>
              <div className="hero-gradient-overlay"></div>
            </div>
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Analytics</h1>
                <p className="text-gray-600">Analytics page coming soon...</p>
              </div>
            </div>
          </div>
        )
      default:
        return <SearchPage hideHeader />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8E9EB] via-[#E0E2E5] to-[#E8E9EB] relative overflow-hidden">
      {/* Common Header for all pages */}
      <div 
        className="hero-gradient-overlay relative w-full"
        style={{
          backgroundImage: `url(${galaxyBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          filter: 'contrast(1.15) saturate(1.1)',
        }}
      >
        <Header activePage={currentPage} />
        {currentPage === 'Star Catalogue' && <HeroSection />}
        {currentPage === 'My Jobs' && (
          <div className="max-w-7xl mx-auto px-8 py-12 relative z-10">
            <HeroSection />
          </div>
        )}
      </div>
      
      {/* Page Content */}
      {renderPage()}
    </div>
  )
}

export default App
