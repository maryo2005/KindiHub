import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';

export const metadata = {
  title: 'KindiHub - Evaluación Educación Inicial',
  description: 'Plataforma de evaluación y seguimiento del aprendizaje en Educación Inicial con asistencia de IA. Captura evidencias, genera reportes y da seguimiento al progreso de cada estudiante.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#1a1d2e" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>" />
      </head>
      <body>
        <AuthProvider>
          <div className="app-layout">
            <Sidebar />
            <main className="main-content">
              {children}
            </main>
            <MobileNav />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
