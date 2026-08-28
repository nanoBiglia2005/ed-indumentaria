import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';

function Layout() {
  return (
    <div className='flex h-screen'>
      <Sidebar />
      <Outlet />
    </div>
  );
}

export default Layout;
