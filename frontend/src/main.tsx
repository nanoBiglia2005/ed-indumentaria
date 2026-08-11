import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { SessionProvider } from './SessionContext.tsx'
import AuthGuard from './AuthGuard.tsx'
import Layout from './Layout.tsx'
import LoginPage from './pages/LoginPage.tsx'
import ArticulosPage from './pages/ArticulosPage.tsx'
import VentasPage from './pages/VentasPage.tsx'
import ConfiguracionPage from './pages/ConfiguracionPage.tsx'
import HistorialPage from './pages/HistorialPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<LoginPage />} />
          <Route path='gestion' element={<AuthGuard />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to='/gestion/articulos' replace />} />
              <Route path='articulos' element={<ArticulosPage />} />
              <Route path='ventas' element={<VentasPage />} />
              <Route path='configuracion' element={<ConfiguracionPage />} />
              <Route path='historial' element={<HistorialPage />} />
              <Route path='*' element={<Navigate to='/gestion/articulos' replace />} />
            </Route>
          </Route>
          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  </StrictMode>,
)
