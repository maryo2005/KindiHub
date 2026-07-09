'use client';
// ============================================
// SessionProvider wrapper for NextAuth
// ============================================
import { SessionProvider } from 'next-auth/react';

export default function AuthProvider({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
