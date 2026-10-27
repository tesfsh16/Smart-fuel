import * as svc from "./service.js";

export async function getDeliveries(req, res, next) {
  try { res.json(await svc.getDeliveries(req.user.userId)); }
  catch (err) { next(err); }
}

export async function createDelivery(req, res, next) {
  try { res.status(201).json(await svc.createDelivery(req.user.userId, req.body)); }
  catch (err) { next(err); }
}

export async function updateStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    res.json(await svc.updateDeliveryStatus(req.user.userId, id, req.body.status));
  } catch (err) { next(err); }
}

export async function reconcile(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    res.json(await svc.reconcileDelivery(req.user.userId, id, req.body.items));
  } catch (err) { next(err); }
}

export async function getSupplyRequests(req, res, next) {
  try { res.json(await svc.getSupplyRequests(req.user.userId)); }
  catch (err) { next(err); }
}

export async function updateSupplyRequest(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    res.json(await svc.updateSupplyRequestStatus(req.user.userId, id, req.body.status));
  } catch (err) { next(err); }
}
