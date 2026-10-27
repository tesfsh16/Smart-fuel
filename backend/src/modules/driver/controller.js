import * as svc from "./service.js";

export async function findStations(req, res, next) {
  try {
    const { fuel, lat, lng } = req.query;
    const data = await svc.findStations({ fuelCode: fuel, lat, lng });
    res.json(data);
  } catch (err) { next(err); }
}

export async function createReservation(req, res, next) {
  try {
    const result = await svc.createReservation(req.user.userId, req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function cancelReservation(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await svc.cancelReservation(req.user.userId, id);
    res.json(result);
  } catch (err) { next(err); }
}

export async function myReservations(req, res, next) {
  try {
    const data = await svc.getMyReservations(req.user.userId);
    res.json(data);
  } catch (err) { next(err); }
}

export async function myQueue(req, res, next) {
  try {
    const data = await svc.getMyQueue(req.user.userId);
    res.json(data);
  } catch (err) { next(err); }
}
