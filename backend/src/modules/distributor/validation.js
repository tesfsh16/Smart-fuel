import { z } from "zod";

export const createDeliverySchema = z.object({
  stationId:   z.coerce.number().int().positive(),
  scheduledAt: z.string().datetime({ message: "scheduledAt must be a valid ISO datetime." }),
  items: z.array(z.object({
    fuelCode:         z.enum(["PETROL", "DIESEL"]),
    expectedQuantity: z.coerce.number().positive(),
  })).min(1, "At least one delivery item is required."),
});

export const updateStatusSchema = z.object({
  status: z.enum(["in_transit", "completed", "cancelled"]),
});

export const reconcileSchema = z.object({
  items: z.array(z.object({
    fuelCode:         z.enum(["PETROL", "DIESEL"]),
    receivedQuantity: z.coerce.number().min(0),
  })).min(1),
});

export const updateSupplySchema = z.object({
  status: z.enum(["approved", "rejected", "fulfilled"]),
});
