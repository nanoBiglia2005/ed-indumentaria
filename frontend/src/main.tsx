import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { SessionProvider } from '@/context/SessionContext'
import AuthGuard from '@/components/layout/AuthGuard'
import Layout from '@/components/layout/Layout'
import LoginPage from '@/features/auth/LoginPage'
import ArticulosPage from '@/features/articulos/ArticulosPage'
import VentasPage from '@/features/ventas/VentasPage'
import ConfiguracionPage from '@/features/configuracion/ConfiguracionPage'
import HistorialPage from '@/features/ventas/HistorialPage'

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
