import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { ROLES_PRECIOS } from '@backend/types'
import { SessionProvider } from '@/context/SessionContext'
import AuthGuard from '@/components/layout/AuthGuard'
import RolGuard from '@/components/layout/RolGuard'
import Layout from '@/components/layout/Layout'
import LoginPage from '@/features/auth/LoginPage'
import ArticulosPage from '@/features/articulos/ArticulosPage'
import VentasPage from '@/features/ventas/VentasPage'
import ConfiguracionPage from '@/features/configuracion/ConfiguracionPage'
import HistorialPage from '@/features/ventas/HistorialPage'
import PreciosPage from '@/features/precios/PreciosPage'

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
              {/* Precios es solo para ROLES_PRECIOS; el backend igual responde
                  403 al resto (routes/precios.js). */}
              <Route element={<RolGuard roles={ROLES_PRECIOS} />}>
                <Route path='precios' element={<PreciosPage />} />
              </Route>
              <Route path='*' element={<Navigate to='/gestion/articulos' replace />} />
            </Route>
          </Route>
          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  </StrictMode>,
)
