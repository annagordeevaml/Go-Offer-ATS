function App() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 50%, #1a0b2e 100%)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(90deg, #7C3AED, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          GoOffer ATS
        </h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.8, marginBottom: '2rem' }}>
          Сайт работает! React загружен успешно.
        </p>
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          backdropFilter: 'blur(10px)',
          borderRadius: '1rem',
          padding: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <p style={{ marginBottom: '1rem' }}>
            ✅ React работает
          </p>
          <p style={{ marginBottom: '1rem' }}>
            ✅ Vite работает
          </p>
          <p>
            ✅ Страница загружена
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
