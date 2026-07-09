// ============================================
// Utilidades generales
// ============================================

/**
 * Formatea fecha a formato español
 */
export function formatDate(date) {
  return new Date(date).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formatea fecha corta
 */
export function formatDateShort(date) {
  return new Date(date).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formatea hora
 */
export function formatTime(date) {
  return new Date(date).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Genera iniciales del nombre
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Traduce nivel de logro
 */
export function getLevelLabel(level) {
  const labels = {
    inicio: 'Inicio',
    proceso: 'Proceso',
    logrado: 'Logrado',
    requiere_apoyo: 'Requiere apoyo',
  };
  return labels[level] || level;
}

/**
 * Color del nivel de logro
 */
export function getLevelColor(level) {
  const colors = {
    inicio: '#ff8787',
    proceso: '#ffd43b',
    logrado: '#69db7c',
    requiere_apoyo: '#e599f7',
  };
  return colors[level] || '#adb5bd';
}

/**
 * Traduce estado de evidencia
 */
export function getStatusLabel(status) {
  const labels = {
    pendiente: 'Pendiente',
    revisada: 'Revisada',
    confirmada: 'Confirmada',
    corregida: 'Corregida',
  };
  return labels[status] || status;
}

/**
 * Traduce tipo de evidencia
 */
export function getTypeLabel(type) {
  const labels = {
    texto: '✏️ Texto',
    audio: '🎙️ Audio',
    foto: '📷 Foto',
    video: '🎥 Video',
    marcacion: '✅ Marcación',
  };
  return labels[type] || type;
}

/**
 * Tamaño de archivo legible
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Genera un color consistente basado en string (para avatares)
 */
export function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    'linear-gradient(135deg, #748ffc, #9775fa)',
    'linear-gradient(135deg, #ff922b, #fcc419)',
    'linear-gradient(135deg, #51cf66, #20c997)',
    'linear-gradient(135deg, #e64980, #be4bdb)',
    'linear-gradient(135deg, #339af0, #22b8cf)',
    'linear-gradient(135deg, #ff6b6b, #ff922b)',
    'linear-gradient(135deg, #845ef7, #5c7cfa)',
    'linear-gradient(135deg, #20c997, #69db7c)',
  ];
  return gradients[Math.abs(hash) % gradients.length];
}

/**
 * Tiempo relativo (hace X minutos, etc.)
 */
export function timeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Justo ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days} días`;
  return formatDateShort(date);
}
