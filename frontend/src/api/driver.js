import { api } from "./client.js";

export const findStations     = (fuel) =>
  api(`/api/driver/stations${fuel && fuel !== "All" ? `?fuel=${fuel}` : ""}`);

export const getMyReservations = () => api("/api/driver/reservations");
export const getMyQueue        = () => api("/api/driver/queue");

export const createReservation = (data) =>
  api("/api/driver/reservations", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const cancelReservation = (id) =>
  api(`/api/driver/reservations/${id}/cancel`, { method: "POST" });
