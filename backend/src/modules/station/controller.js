import * as svc from "./service.js";

export async function dashboard(req, res, next) {
  try { res.json(await svc.getDashboard(req.stationId)); }
  catch (err) { next(err); }
}

export async function inventory(req, res, next) {
  try { res.json(await svc.getInventory(req.stationId)); }
  catch (err) { next(err); }
}

export async function inventoryMovements(req, res, next) {
  try { res.json(await svc.getInventoryMovements(req.stationId)); }
  catch (err) { next(err); }
}

export async function reservations(req, res, next) {
  try {
    const status = req.query.status || "active";
    res.json(await svc.getReservations(req.stationId, status));
  } catch (err) { next(err); }
}

export async function queue(req, res, next) {
  try { res.json(await svc.getQueue(req.stationId)); }
  catch (err) { next(err); }
}

export async function deliveries(req, res, next) {
  try { res.json(await svc.getDeliveries(req.stationId)); }
  catch (err) { next(err); }
}

export async function confirmFuelled(req, res, next) {
  try {
    const reservationId = parseInt(req.params.id, 10);
    const result = await svc.confirmFuelled(req.stationId, reservationId, req.user.userId);
    res.json(result);
  } catch (err) { next(err); }
}
