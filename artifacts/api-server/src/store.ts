import mongoose, { Schema, model, Document } from "mongoose";
import { config } from "./config";
import { logger } from "./lib/logger";

// ── Whitelisted UID model ──────────────────────────────────────────────
export interface WhitelistedUid {
  uid: string;
  days: number;
  bluestack: boolean;
  addedBy: string;
  addedAt: string;
}

interface UidDoc extends WhitelistedUid, Document {}

const uidSchema = new Schema<UidDoc>({
  uid:       { type: String, required: true, unique: true },
  days:      { type: Number, default: 30 },
  bluestack: { type: Boolean, default: true },
  addedBy:   { type: String, default: "" },
  addedAt:   { type: String, default: () => new Date().toISOString() },
});

const UidModel = model<UidDoc>("WhitelistedUid", uidSchema);

export const uidStore = {
  async save(uid: string, days: number, bluestack: boolean, addedBy: string): Promise<void> {
    await ensureConnection();
    if (!connected) return;
    try {
      await UidModel.updateOne({ uid }, { uid, days, bluestack, addedBy, addedAt: new Date().toISOString() }, { upsert: true });
      logger.info({ uid, addedBy }, "UID saved to MongoDB");
    } catch (err) {
      logger.error({ err, uid }, "Failed to save UID to MongoDB");
    }
  },

  async remove(uid: string): Promise<void> {
    await ensureConnection();
    if (!connected) return;
    try {
      await UidModel.deleteOne({ uid });
      logger.info({ uid }, "UID removed from MongoDB");
    } catch (err) {
      logger.error({ err, uid }, "Failed to remove UID from MongoDB");
    }
  },

  async listByUser(username: string): Promise<WhitelistedUid[]> {
    await ensureConnection();
    if (!connected) return [];
    const docs = await UidModel.find({ addedBy: username });
    return docs.map(d => ({ uid: d.uid, days: d.days, bluestack: d.bluestack, addedBy: d.addedBy, addedAt: d.addedAt }));
  },

  async removeByUser(username: string): Promise<string[]> {
    await ensureConnection();
    if (!connected) return [];
    const docs = await UidModel.find({ addedBy: username });
    const uids = docs.map(d => d.uid);
    if (uids.length > 0) {
      await UidModel.deleteMany({ addedBy: username });
      logger.info({ username, count: uids.length }, "UIDs removed for deleted user");
    }
    return uids;
  },

  async list(): Promise<WhitelistedUid[]> {
    await ensureConnection();
    if (!connected) return [];
    const docs = await UidModel.find({});
    return docs.map(d => ({ uid: d.uid, days: d.days, bluestack: d.bluestack, addedBy: d.addedBy, addedAt: d.addedAt }));
  },
};

// ── App user model ─────────────────────────────────────────────────────
export interface AppUser {
  username: string;
  password: string;
  role: "admin" | "user";
  createdAt: string;
  defaultDays: number;
  isTrial: boolean;
}

interface UserDoc extends AppUser, Document {}

const userSchema = new Schema<UserDoc>({
  username:    { type: String, required: true, unique: true },
  password:    { type: String, required: true },
  role:        { type: String, enum: ["admin", "user"], default: "user" },
  createdAt:   { type: String, default: () => new Date().toISOString() },
  defaultDays: { type: Number, default: 30 },
  isTrial:     { type: Boolean, default: false },
});

const UserModel = model<UserDoc>("User", userSchema);

let connected = false;

async function ensureConnection() {
  if (connected) return;
  try {
    await mongoose.connect(config.MONGODB_URI);
    connected = true;
    logger.info("MongoDB connected");
    await seedAdmin();
  } catch (err) {
    logger.error({ err }, "MongoDB connection failed — using fallback in-memory store");
  }
}

async function seedAdmin() {
  const exists = await UserModel.findOne({ role: "admin" });
  if (!exists) {
    await UserModel.create({
      username:    config.ADMIN_USERNAME,
      password:    config.ADMIN_PASSWORD,
      role:        "admin",
      createdAt:   new Date().toISOString(),
      defaultDays: 30,
      isTrial:     false,
    });
    logger.info("Admin user seeded");
  } else if (exists.username !== config.ADMIN_USERNAME || exists.password !== config.ADMIN_PASSWORD) {
    await UserModel.updateOne({ role: "admin" }, { username: config.ADMIN_USERNAME, password: config.ADMIN_PASSWORD });
    logger.info("Admin credentials updated from config");
  }
}

// ── Fallback in-memory store (if MongoDB is unavailable) ──
const fallbackUsers = new Map<string, AppUser>();
fallbackUsers.set(config.ADMIN_USERNAME, {
  username: config.ADMIN_USERNAME,
  password: config.ADMIN_PASSWORD,
  role: "admin",
  createdAt: new Date().toISOString(),
  defaultDays: 30,
  isTrial: false,
});

// ── Trial UID count (in-memory, not persisted) ──
const trialUidCounts = new Map<string, number>();

export const trialStore = {
  getCount(username: string): number {
    return trialUidCounts.get(username) ?? 0;
  },
  increment(username: string): void {
    trialUidCounts.set(username, (trialUidCounts.get(username) ?? 0) + 1);
  },
};

export const userStore = {
  async find(username: string): Promise<AppUser | undefined> {
    await ensureConnection();
    if (!connected) return fallbackUsers.get(username);
    const doc = await UserModel.findOne({ username });
    return doc ? toPlain(doc) : undefined;
  },

  async list(): Promise<AppUser[]> {
    await ensureConnection();
    if (!connected) return Array.from(fallbackUsers.values()).filter(u => u.role !== "admin");
    const docs = await UserModel.find({ role: "user" });
    return docs.map(toPlain);
  },

  async add(username: string, password: string, defaultDays: number, isTrial = false): Promise<{ ok: true; user: AppUser } | { ok: false; error: string }> {
    await ensureConnection();
    if (!connected) {
      if (fallbackUsers.has(username)) return { ok: false, error: "Username already exists" };
      const user: AppUser = { username, password, role: "user", createdAt: new Date().toISOString(), defaultDays, isTrial };
      fallbackUsers.set(username, user);
      return { ok: true, user };
    }
    const exists = await UserModel.findOne({ username });
    if (exists) return { ok: false, error: "Username already exists" };
    const user: AppUser = { username, password, role: "user", createdAt: new Date().toISOString(), defaultDays, isTrial };
    await UserModel.create(user);
    return { ok: true, user };
  },

  async remove(username: string): Promise<boolean> {
    await ensureConnection();
    if (!connected) {
      const u = fallbackUsers.get(username);
      if (!u || u.role === "admin") return false;
      return fallbackUsers.delete(username);
    }
    const result = await UserModel.deleteOne({ username, role: "user" });
    return result.deletedCount > 0;
  },

  async verify(username: string, password: string): Promise<AppUser | null> {
    await ensureConnection();
    if (!connected) {
      const u = fallbackUsers.get(username);
      if (!u || u.password !== password) return null;
      return u;
    }
    const doc = await UserModel.findOne({ username, password });
    return doc ? toPlain(doc) : null;
  },
};

function toPlain(doc: UserDoc): AppUser {
  return {
    username:    doc.username,
    password:    doc.password,
    role:        doc.role,
    createdAt:   doc.createdAt,
    defaultDays: doc.defaultDays,
    isTrial:     doc.isTrial,
  };
}

// ── Purge expired trial users ───────────────────────────────────────────
export async function purgeExpiredTrials(): Promise<{ username: string; uids: string[] }[]> {
  await ensureConnection();
  if (!connected) return [];
  const now = Date.now();
  const trialUsers = await UserModel.find({ isTrial: true, role: "user" });
  const expired = trialUsers.filter((u) => {
    const expiresAt = new Date(u.createdAt).getTime() + u.defaultDays * 24 * 60 * 60 * 1000;
    return expiresAt <= now;
  });
  const purged: { username: string; uids: string[] }[] = [];
  for (const u of expired) {
    const uidDocs = await UidModel.find({ addedBy: u.username });
    const uids = uidDocs.map((d) => d.uid);
    await UidModel.deleteMany({ addedBy: u.username });
    await UserModel.deleteOne({ _id: u._id });
    logger.info({ username: u.username, uids }, "Expired trial purged");
    purged.push({ username: u.username, uids });
  }
  return purged;
}

// Start connection immediately on import
ensureConnection().catch(() => {});
