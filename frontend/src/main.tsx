import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Layout from './Layout.tsx'
import ArticulosPage from './pages/ArticulosPage.tsx'
import VentasPage from './pages/VentasPage.tsx'
import ConfiguracionPage from './pages/ConfiguracionPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to='/articulos' replace />} />
          <Route path='articulos' element={<ArticulosPage />} />
          <Route path='ventas' element={<VentasPage />} />
          <Route path='configuracion' element={<ConfiguracionPage />} />
          <Route path='*' element={<Navigate to='/articulos' replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
