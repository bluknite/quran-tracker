import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Reader } from './pages/Reader'
import { KhatmProgress } from './pages/KhatmProgress'
import { ScrollToTop } from './components/ScrollToTop'

function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <AuthProvider>
        <SettingsProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="khatm/:id" element={<KhatmProgress />} />
              <Route path="read" element={<Reader />} />
            </Route>
          </Routes>
        </SettingsProvider>
      </AuthProvider>
    </HashRouter>
  )
}

export default App
