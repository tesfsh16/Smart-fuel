import { api } from "./client.js";

export const getDashboard    = () => api("/api/station/dashboard");
export const getInventory    = () => api("/api/station/inventory");
export const getMovements    = () => api("/api/station/inventory/movements");
export const getReservations = (status = "active") => api(`/api/station/reservations?status=${status}`);
export const getQueue        = () => api("/api/station/queue");
export const getDeliveries   = () => api("/api/station/deliveries");

export const confirmFuelled = (queueEntryReservationId) =>
  api(`/api/station/queue/${queueEntryReservationId}/confirm`, { method: "POST" });
