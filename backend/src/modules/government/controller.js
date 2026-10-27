import * as svc from "./service.js";

export async function nationalOverview(req, res, next) {
  try {
    const data = await svc.getNationalOverview();
    res.json(data);
  } catch (err) { next(err); }
}

export async function stationSummaries(req, res, next) {
  try {
    const data = await svc.getStationSummaries();
    res.json(data);
  } catch (err) { next(err); }
}

export async function predictions(req, res, next) {
  try {
    const data = await svc.getShortagesPredictions();
    res.json(data);
  } catch (err) { next(err); }
}

export async function anomalies(req, res, next) {
  try {
    const data = await svc.getAnomalies();
    res.json(data);
  } catch (err) { next(err); }
}
