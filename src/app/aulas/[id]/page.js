'use client';
// ============================================
// Vista de Aula - Carpetas Anidadas
// ============================================
import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AulaFolderPage({ params }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') {
      fetch('/api/classrooms')
        .then(res => res.json())
        .then(data => {
          setClassroom(data.find(c => c.id === id));
          setLoading(false);
        });
    }
  }, [status, id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-breadcrumb">
          <Link href="/aulas">Aulas</Link>
          <span className="page-breadcrumb-separator">›</span>
          <span>{classroom?.name || 'Aula'}</span>
        </div>
        <div className="page-header-top">
          <div>
            <h1 className="page-title">📁 {classroom?.name}</h1>
            <p className="page-subtitle">Selecciona una carpeta para continuar</p>
          </div>
        </div>
      </div>

      <div className="grid-2 mt-4">
        {/* Carpeta Cuadernos de Campo (Directo a Sesiones) */}
        <Link href={`/aulas/${id}/cuadernos`} className="card card-clickable text-center" style={{ padding: 'var(--space-8) var(--space-4)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>📓</div>
          <h2 className="card-title text-xl">Cuadernos de Campo</h2>
          <p className="card-subtitle mt-2">Gestionar sesiones y archivos Word</p>
        </Link>

        {/* Carpeta Evidencias */}
        <Link href={`/aulas/${id}/evidencias`} className="card card-clickable text-center" style={{ padding: 'var(--space-8) var(--space-4)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>📂</div>
          <h2 className="card-title text-xl">Evidencias</h2>
          <p className="card-subtitle mt-2">Portafolios de estudiantes</p>
        </Link>
      </div>
    </div>
  );
}
