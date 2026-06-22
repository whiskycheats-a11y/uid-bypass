import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be max 20 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const addUidSchema = z.object({
  uid: z
    .string()
    .min(1, "UID is required")
    .regex(/^\d+$/, "UID must be numeric"),
  days: z.number().int().min(1, "Days must be at least 1").max(365, "Max 365 days"),
});

export const extendUidSchema = z.object({
  uid: z
    .string()
    .min(1, "UID is required")
    .regex(/^\d+$/, "UID must be numeric"),
  days: z.number().int().min(1, "Days must be at least 1").max(365, "Max 365 days"),
});

export const replaceUidSchema = z.object({
  oldUid: z
    .string()
    .min(1, "Old UID is required")
    .regex(/^\d+$/, "UID must be numeric"),
  newUid: z
    .string()
    .min(1, "New UID is required")
    .regex(/^\d+$/, "UID must be numeric"),
});

export const removeUidSchema = z.object({
  uid: z
    .string()
    .min(1, "UID is required")
    .regex(/^\d+$/, "UID must be numeric"),
});

export const infoUidSchema = z.object({
  uid: z
    .string()
    .min(1, "UID is required")
    .regex(/^\d+$/, "UID must be numeric"),
});

export const addUserSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["RESELLER", "MANAGER", "ADMIN", "SUPER_ADMIN"]),
  uidLimit: z.number().int().min(0, "UID limit must be non-negative"),
  profilePicture: z.string().url("Invalid image URL").optional().or(z.literal("")),
});

export const editUserSchema = z.object({
  userId: z.number().int(),
  email: z.string().email("Invalid email address"),
  role: z.enum(["RESELLER", "MANAGER", "ADMIN", "SUPER_ADMIN"]),
  profilePicture: z.string().url("Invalid image URL").optional().or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const updateUidLimitSchema = z.object({
  userId: z.number().int(),
  amount: z.number().int(),
  description: z.string().min(1, "Description is required"),
});

// New Schemas
export const createFreePortalSchema = z.object({
  brandName: z.string().min(2, "Brand name must be at least 2 characters").max(30),
  durationHours: z.number().int().min(1).max(72, "Max duration is 72 hours (3 days)"),
  maxUids: z.number().int().min(1, "Must allow at least 1 use"),
  expiryDays: z.number().int().min(1, "Must be valid for at least 1 day").max(3, "Max 3 days").optional(),
});

export const updateFreePortalSchema = z.object({
  portalId: z.number().int(),
  brandName: z.string().min(2).max(30).optional(),
  durationHours: z.number().int().min(1).max(72).optional(),
  maxUids: z.number().int().min(1).optional(),
  expiryDays: z.number().int().min(1).max(3).optional(),
});

export const clientWhitelistSchema = z.object({
  portalToken: z.string().min(1),
  uid: z.string().min(1, "UID is required").regex(/^\d+$/, "UID must be numeric"),
});

export const createAlertSchema = z.object({
  type: z.enum(["Info", "Announcement", "Success", "Warning", "Danger", "Disabled"]),
  message: z.string().min(1, "Message is required"),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(1000, "Message is too long"),
});
