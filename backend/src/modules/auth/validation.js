import { z } from "zod";

// Require a proper email domain: must have a dot, and the TLD must be
// at least 2 chars (rejects "gmail.c" etc. — note .co is a valid TLD).
// The browser <input type="email"> already blocks the most obvious typos;
// this server-side check adds a consistent second layer.
const strictEmail = z
  .string()
  .email("Enter a valid email address.")
  .refine(
    (val) => {
      const atIndex = val.lastIndexOf("@");
      if (atIndex < 1) return false;
      const domain = val.slice(atIndex + 1);
      const dotIndex = domain.lastIndexOf(".");
      if (dotIndex < 1) return false;
      const tld = domain.slice(dotIndex + 1);
      return tld.length >= 2;
    },
    "Enter a valid email address (e.g. you@example.com)."
  );

export const registerSchema = z.object({
  email:    strictEmail,
  fullName: z.string().min(2, "Name is too short."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role:     z.enum(["DRIVER"]).default("DRIVER"),
});

export const loginSchema = z.object({
  email:    strictEmail,
  password: z.string().min(1, "Password is required."),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required."),
});
