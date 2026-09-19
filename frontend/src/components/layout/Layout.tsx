import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';

function Layout() {
  return (
    // Mobile: header arriba + contenido debajo. Desde md: sidebar a la izquierda.
    <div className='flex h-screen min-h-0 flex-col md:flex-row'>
      <Sidebar />
      <Outlet />
    </div>
  );
}

export default Layout;
