export const sendWhatsAppNotification = (phone: string, message: string) => {
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${phone}?text=${encodedMessage}`;
  window.open(url, '_blank');
};

export const generateAdminReviewLink = (reportId: string) => {
  const baseUrl = window.location.origin;
  // Point to the Owner app route
  return `${baseUrl}/#/owner/review/${reportId}`;
};

export const generateTechEditLink = (reportId: string, machineId: string) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/#/tech/form/${machineId}?reportId=${reportId}`;
};

export const generateStartVisitMessage = (machineLocation: string, techName: string) => {
  return `👋 Hola, soy el técnico ${techName}.\n\n📍 Estoy llegando a *${machineLocation}* para realizar el mantenimiento programado del sistema de purificación.\n\nLe notificaré cuando haya finalizado.`;
};