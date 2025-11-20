/**
 * js/utils.js
 * Funciones de utilidad para toda la aplicación
 */

export const utils = {
  // Formatea números a moneda (MXN)
  formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  },

  // Formatea kWh con 3 decimales
  formatKwh(kwh) {
    return (kwh || 0).toFixed(3) + ' kWh';
  },

  // Capitaliza textos (ej. "refrigerador" -> "Refrigerador")
  capitalize(text) {
    if (!text) return '';
    // Reemplaza guiones bajos por espacios y capitaliza
    const clean = text.replace(/_/g, ' ');
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  },

  // Devuelve color verde/gris según si la fecha es reciente (< 10 min)
  isOnline(lastHeartbeat) {
    if (!lastHeartbeat) return false;
    const now = new Date();
    const last = new Date(lastHeartbeat);
    const diffMs = now - last;
    const tenMinutes = 70 * 1000;
    return diffMs < tenMinutes;
  }
};