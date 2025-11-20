import { useState, useEffect } from 'react'
import SearchPage from './components/SearchPage'
import MyJobsPage from './components/MyJobsPage'
import SearchResultsPage from './components/SearchResultsPage'
import ChatBot from './components/ChatBot'

type Page = 'Search' | 'My Jobs' | 'Analytics' | 'Search Results'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('Search Results')

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

  // Simple navigation context - in production, use React Router
  if (currentPage === 'My Jobs') {
    return <MyJobsPage onNavigate={handleNavigation} />
  }

  if (currentPage === 'Search Results') {
    return <SearchResultsPage onNavigate={handleNavigation} />
  }

  if (currentPage === 'Search') {
    return <SearchPage onNavigate={handleNavigation} />
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

