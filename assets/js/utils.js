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
  },

  // Convierte "2026-W11" (Input type="week") al LUNES de esa semana en formato YYYY-MM-DD
  weekToDateString(weekStr) {
    if (!weekStr || !weekStr.includes("W")) return "";
    const [yearStr, weekNumStr] = weekStr.split("-W");
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekNumStr, 10);
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    const m = String(ISOweekStart.getMonth() + 1).padStart(2, "0");
    const d = String(ISOweekStart.getDate()).padStart(2, "0"); return `${ISOweekStart.getFullYear()}-${m}-${d}`;
  },

  // Obtiene el string ISO de la semana actual (Ej. "2026-W11") para llenar el input type="week"
  getCurrentWeekString() {
    const d = new Date();
    // Forzamos cálculos en UTC para evitar giros de fecha loca
    const dUTC = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = dUTC.getUTCDay() || 7;
    dUTC.setUTCDate(dUTC.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(dUTC.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((dUTC - yearStart) / 86400000) + 1) / 7);
    return `${dUTC.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  },

  // Convierte "2026-W11" a formato humano "09 al 15 03/2026"
  formatHumanWeek(weekStr) {
    if(!weekStr || !weekStr.includes("W")) return weekStr;
    const dateStr = this.weekToDateString(weekStr);
    if (!dateStr) return weekStr;
    const [y, m, d] = dateStr.split('-');
    const monday = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    
    const d1 = String(monday.getDate()).padStart(2, '0');
    const d2 = String(sunday.getDate()).padStart(2, '0');
    const m1 = String(monday.getMonth() + 1).padStart(2, '0');
    const m2 = String(sunday.getMonth() + 1).padStart(2, '0');
    const y2 = sunday.getFullYear();
    
    if (m1 === m2) {
      return `${d1} al ${d2} ${m2}/${y2}`;
    } else {
      return `${d1}/${m1} al ${d2}/${m2} ${y2}`;
    }
  }
};