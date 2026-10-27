import { z } from "zod";

const strictEmail = z
  .string()
  .email("Enter a valid email.")
  .refine(val => /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(val), "Enter a valid email (e.g. user@example.com).");

export const createEntitySchema = z.discriminatedUnion("type", [

  z.object({
    type: z.literal("station"),
    name:    z.string().min(2),
    region:  z.string().min(2),
    city:    z.string().optional(),
    address: z.string().optional(),
    lat:     z.coerce.number().optional(),
    lng:     z.coerce.number().optional(),
    // Initial fuel stock (litres)
    initialPetrol: z.coerce.number().min(0).default(0),
    initialDiesel: z.coerce.number().min(0).default(0),
    // Station manager account
    managerName:     z.string().min(2),
    managerEmail:    strictEmail,
    managerPassword: z.string().min(8),
  }),

  z.object({
    type: z.literal("authority"),
    fullName: z.string().min(2),
    email:    strictEmail,
    password: z.string().min(8),
  }),

  z.object({
    type: z.literal("distributor"),
    organizationName: z.string().min(2),
    fullName: z.string().min(2),
    email:    strictEmail,
    password: z.string().min(8),
  }),

]);

export const toggleUserSchema = z.object({
  status: z.enum(["active", "suspended"]),
});
