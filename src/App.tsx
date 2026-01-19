import { useState, useEffect } from 'react'
import Header from './components/Header'
import HeroSection from './components/HeroSection'
// ВРЕМЕННО БЕЗ SUPABASE
// import SearchPage from './components/SearchPage'
// import { useAuth } from './hooks/useAuth'

type Page = 'Star Catalogue' | 'My Jobs' | 'Analytics' | 'Benchmark'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('Star Catalogue')
  // ВРЕМЕННО БЕЗ АУТЕНТИФИКАЦИИ
  // const { user, loading } = useAuth()

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

  // ШАГ 1: Базовая структура с Header и HeroSection
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0b2e] via-[#2d1b4e] to-[#1a0b2e]">
      <Header activePage={currentPage} />
      <HeroSection />
      
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">
            Этап 1: Базовая структура восстановлена
          </h2>
          <p className="text-white/80 mb-4">
            ✅ CSS стили подключены
          </p>
          <p className="text-white/80 mb-4">
            ✅ Header компонент работает
          </p>
          <p className="text-white/80 mb-4">
            ✅ HeroSection компонент работает
          </p>
          <p className="text-white/60 text-sm mt-6">
            Следующий шаг: восстановление SearchPage
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
