// URL OFICIAL DE PRODUCCIÓN
// Esto asegura que aunque el técnico use una versión vieja, el link que comparte lleve a la nueva.
export const PRODUCTION_URL = 'https://portal-agua24.vercel.app';

export const sendWhatsAppNotification = (phone: string, message: string) => {
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${phone}?text=${encodedMessage}`;
  window.open(url, '_blank');
};

export const generateAdminReviewLink = (reportId: string) => {
  // Usamos PRODUCTION_URL en lugar de window.location.origin
  return `${PRODUCTION_URL}/#/owner/review/${reportId}`;
};

export const generateTechEditLink = (reportId: string, machineId: string) => {
  return `${PRODUCTION_URL}/#/tech/form/${machineId}?reportId=${reportId}`;
};

export const generateStartVisitMessage = (machineLocation: string, techName: string) => {
  return `👋 Hola, soy el técnico ${techName}.\n\n📍 Estoy llegando a *${machineLocation}* para realizar el mantenimiento programado del sistema de purificación.\n\nLe notificaré cuando haya finalizado.`;
};

export const generateCondoReportMessage = (machineId: string, location: string, date: string, tds: string, ph: string) => {
    return `✅ *Mantenimiento Finalizado*\n\nEstimado cliente, el servicio de purificación en *${location}* (ID: ${machineId}) ha sido completado y validado exitosamente hoy ${date}.\n\n📊 *Resumen de Calidad:*\n🔹 TDS (Pureza): ${tds} ppm\n🔹 pH: ${ph}\n\n📄 Puede descargar su reporte detallado y consultar el historial ingresando a su portal:\n${PRODUCTION_URL}/#/login/condo\n\n_Agua/24 - Siempre pura._`;
};