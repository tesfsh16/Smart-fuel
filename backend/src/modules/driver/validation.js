import { z } from "zod";

export const findStationsSchema = z.object({
  fuel: z.enum(["PETROL", "DIESEL"]).optional(),
  lat:  z.coerce.number().optional(),
  lng:  z.coerce.number().optional(),
});

export const createReservationSchema = z.object({
  stationId:   z.coerce.number().int().positive(),
  fuelCode:    z.enum(["PETROL", "DIESEL"]),
  amountL:     z.coerce.number().positive("Amount must be greater than 0").max(200, "Max 200 L per reservation"),
  plateNumber: z.string().min(3).optional(),
  vehicleType: z.string().optional(),
});

export const cancelReservationSchema = z.object({
  id: z.coerce.number().int().positive(),
});
