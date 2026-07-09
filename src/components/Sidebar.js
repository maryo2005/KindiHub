'use client';
// ============================================
// Sidebar - Navegación principal (Laptop)
// ============================================
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  const navItems = [
    { label: 'Inicio', href: '/', icon: '🏠' },
    { section: 'GESTIÓN' },
    { label: 'Aulas', href: '/aulas', icon: '🏫' },
    { label: 'Cuadernos de Campo', href: '/cuaderno', icon: '📓' },
    { label: 'Sesiones', href: '/sesion', icon: '📋' },
    { section: 'EVALUACIÓN' },
    { label: 'Evidencias', href: '/revisiones', icon: '📝' },
    { label: 'Portafolios', href: '/portafolio', icon: '📂' },
    { section: 'ANÁLISIS' },
    { label: 'Seguimiento', href: '/seguimiento', icon: '📊' },
    { label: 'Reportes', href: '/reportes', icon: '📈' },
  ];

  const initials = session.user?.name
    ? session.user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <aside className="sidebar" id="main-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🎓</div>
          <div>
            <div className="sidebar-logo-text">KindiHub</div>
            <div className="sidebar-logo-subtitle">Educación Inicial</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          if (item.section) {
            return (
              <div key={i} className="sidebar-section-title">
                {item.section}
              </div>
            );
          }

          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              id={`nav-${item.href.replace(/\//g, '') || 'home'}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{session.user?.name}</div>
          <div className="sidebar-user-role">Docente</div>
        </div>
        <button
          className="btn btn-ghost btn-icon-sm"
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Cerrar sesión"
          id="btn-logout"
        >
          🚪
        </button>
      </div>
    </aside>
  );
}
