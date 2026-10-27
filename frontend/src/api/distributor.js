import { api } from "./client.js";

export const getDeliveries     = () => api("/api/distributor/deliveries");
export const getSupplyRequests = () => api("/api/distributor/supply-requests");

export const createDelivery = (data) =>
  api("/api/distributor/deliveries", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateDeliveryStatus = (id, status) =>
  api(`/api/distributor/deliveries/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const reconcileDelivery = (id, items) =>
  api(`/api/distributor/deliveries/${id}/reconcile`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });

export const updateSupplyStatus = (id, status) =>
  api(`/api/distributor/supply-requests/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
