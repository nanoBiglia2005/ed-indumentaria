import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { ROLES_PRECIOS, ROLES_ARTICULOS, ROLES_CONFIGURACION, ROLES_HISTORIAL } from '@backend/types'
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
                {/* Ventas es la unica pagina que ven los cuatro roles: es el
                    destino por defecto y el fallback de todo RolGuard. */}
                <Route index element={<Navigate to='/gestion/ventas' replace />} />
                {/* Articulos es solo para ROLES_ARTICULOS (el rol "empleado"
                    queda afuera: solo tiene acceso a Ventas); el backend igual
                    responde 403 al resto (routes/articulos.js, grupos.js,
                    subgrupos.js, clientes.js, print.js, asociaciones.js). */}
                <Route element={<RolGuard roles={ROLES_ARTICULOS} />}>
                  <Route path='articulos' element={<ArticulosPage />} />
                </Route>
                <Route path='ventas' element={<VentasPage />} />
                {/* Configuracion e Historial son solo para ROLES_CONFIGURACION /
                    ROLES_HISTORIAL (ni "empleado" ni "ventas" entran); el
                    backend igual responde 403 al resto (routes/tiposDePago.js,
                    routes/remitos.js). */}
                <Route element={<RolGuard roles={ROLES_CONFIGURACION} />}>
                  <Route path='configuracion' element={<ConfiguracionPage />} />
                </Route>
                <Route element={<RolGuard roles={ROLES_HISTORIAL} />}>
                  <Route path='historial' element={<HistorialPage />} />
                </Route>
                {/* Precios es solo para ROLES_PRECIOS; el backend igual responde
                    403 al resto (routes/precios.js). */}
                <Route element={<RolGuard roles={ROLES_PRECIOS} />}>
                  <Route path='precios' element={<PreciosPage />} />
                </Route>
                <Route path='*' element={<Navigate to='/gestion/ventas' replace />} />
              </Route>
            </Route>
            <Route path='*' element={<Navigate to='/' replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </SessionProvider>
  </StrictMode>,
)
