'use client';
// ============================================
// Página de Registro de Usuario
// ============================================
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar usuario');
      }

      // Registro exitoso, iniciar sesión automáticamente
      const loginResult = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (loginResult?.error) {
        setError('Registro completo, pero ocurrió un error al iniciar sesión automáticamente. Por favor inicia sesión manualmente.');
        setLoading(false);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ marginLeft: 0 }}>
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🎓</div>
          <h1 className="login-title">KindiHub</h1>
          <p className="login-subtitle">Crear Cuenta de Docente — Educación Inicial</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="register-name">Nombre completo</label>
            <input
              id="register-name"
              type="text"
              className="form-input"
              placeholder="María Pérez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">Correo electrónico</label>
            <input
              id="register-email"
              type="email"
              className="form-input"
              placeholder="docente@kindihub.edu.pe"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-password">Contraseña</label>
            <input
              id="register-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
              <span className="alert-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className={`btn btn-primary btn-full btn-lg ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
            id="btn-register"
          >
            {loading ? (
              <>
                <span className="spinner spinner-sm"></span>
                Registrando...
              </>
            ) : (
              'Registrarse y Comenzar'
            )}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" style={{ color: 'var(--primary-color)', fontWeight: '600', textDecoration: 'none' }}>
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
