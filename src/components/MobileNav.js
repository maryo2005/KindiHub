'use client';
// ============================================
// MobileNav - Navegación inferior (Celular)
// ============================================
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  const navItems = [
    { label: 'Inicio', href: '/dashboard', icon: '🏠' },
    { label: 'Mis Aulas', href: '/aulas', icon: '🏫' },
  ];

  return (
    <nav className="mobile-nav" id="mobile-navigation">
      <ul className="mobile-nav-list" style={{ display: 'flex', justifyContent: 'space-around', width: '100%', padding: 0, margin: 0, listStyle: 'none' }}>
        {navItems.map(item => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <li key={item.href} style={{ flex: 1 }}>
              <Link
                href={item.href}
                className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                id={`mobile-nav-${item.href.replace(/\//g, '') || 'home'}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
        {/* Botón de Salir para móviles */}
        <li style={{ flex: 1 }}>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="mobile-nav-item"
            style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text-muted)' }}
          >
            <span className="nav-icon">🚪</span>
            <span>Salir</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
