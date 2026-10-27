import { api } from "./client.js";

export const getOverview    = () => api("/api/government/overview");
export const getStations    = () => api("/api/government/stations");
export const getPredictions = () => api("/api/government/predictions");
export const getAnomalies   = () => api("/api/government/anomalies");
