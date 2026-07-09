export const metadata = {
  title: 'Iniciar Sesión — KindiHub',
  description: 'Inicia sesión en KindiHub, plataforma de evaluación para Educación Inicial',
};

export default function LoginLayout({ children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      {children}
    </div>
  );
}
