import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { ROLES_PRECIOS } from '@backend/types'
import { SessionProvider } from '@/context/SessionContext'
import AuthGuard from '@/components/layout/AuthGuard'
import RolGuard from '@/components/layout/RolGuard'
import Layout from '@/components/layout/Layout'

const LoginPage         = lazy(() => import('@/features/auth/LoginPage'))
const ArticulosPage     = lazy(() => import('@/features/articulos/ArticulosPage'))
const VentasPage        = lazy(() => import('@/features/ventas/VentasPage'))
const ConfiguracionPage = lazy(() => import('@/features/configuracion/ConfiguracionPage'))
const HistorialPage     = lazy(() => import('@/features/ventas/HistorialPage'))
const PreciosPage       = lazy(() => import('@/features/precios/PreciosPage'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <BrowserRouter>
        <Suspense fallback={<div className='p-8 text-violet-700'>Cargando…</div>}>
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
        </Suspense>
      </BrowserRouter>
    </SessionProvider>
  </StrictMode>,
)
