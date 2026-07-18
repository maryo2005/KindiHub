'use client';
// ============================================
// MobileNav - Navegación inferior (Celular)
// ============================================
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
      <ul className="mobile-nav-list">
        {navItems.map(item => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <li key={item.href}>
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
      </ul>
    </nav>
  );
}
