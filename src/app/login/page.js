'use client';
// ============================================
// Página de Login
// ============================================
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setError('');
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.credentials) {
        setEmail(data.credentials.email);
        setPassword(data.credentials.password);
        setError('');
        alert(`✅ Datos demo creados!\n\nCorreo: ${data.credentials.email}\nContraseña: ${data.credentials.password}\n\nAhora puedes iniciar sesión.`);
      } else {
        alert(data.message || 'Ya existen datos en el sistema.');
      }
    } catch (err) {
      setError('Error al crear datos demo');
    }
    setSeeding(false);
  };

  return (
    <div className="login-container" style={{ marginLeft: 0 }}>
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🎓</div>
          <h1 className="login-title">KindiHub</h1>
          <p className="login-subtitle">Plataforma de Evaluación — Educación Inicial</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="docente@kindihub.edu.pe"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
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
            id="btn-login"
          >
            {loading ? (
              <>
                <span className="spinner spinner-sm"></span>
                Ingresando...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <div style={{ 
            height: 1, 
            background: 'var(--border-color)', 
            margin: 'var(--space-4) 0',
            position: 'relative' 
          }}>
            <span style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              padding: '0 var(--space-3)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
            }}>
              Primera vez
            </span>
          </div>

          <button
            onClick={handleSeed}
            className={`btn btn-outline btn-full ${seeding ? 'btn-loading' : ''}`}
            disabled={seeding}
            id="btn-seed"
            style={{ marginTop: 'var(--space-4)' }}
          >
            {seeding ? (
              <>
                <span className="spinner spinner-sm"></span>
                Creando datos demo...
              </>
            ) : (
              <>🌱 Crear datos de demostración</>
            )}
          </button>

          <p style={{ 
            fontSize: 'var(--text-xs)', 
            color: 'var(--text-muted)', 
            marginTop: 'var(--space-2)' 
          }}>
            Crea un usuario demo con aula, estudiantes y sesión de ejemplo
          </p>
        </div>
      </div>
    </div>
  );
}
