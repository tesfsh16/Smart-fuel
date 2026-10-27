import { api } from "./client.js";

// Station
export const stationCreateRequest = (data) =>
  api("/api/supply", { method: "POST", body: JSON.stringify(data) });
export const stationGetRequests = () => api("/api/supply/station");

// Authority
export const authorityGetRequests = () => api("/api/supply/authority");
export const authorityReview = (id, data) =>
  api(`/api/supply/${id}/review`, { method: "PATCH", body: JSON.stringify(data) });

// Distributor
export const distributorGetRequests = () => api("/api/supply/distributor");
export const distributorFulfil = (id, scheduledAt) =>
  api(`/api/supply/${id}/fulfil`, { method: "POST", body: JSON.stringify({ scheduledAt }) });
