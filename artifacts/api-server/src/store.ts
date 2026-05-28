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

interface UidDoc extends WhitelistedUid, Document { }

const uidSchema = new Schema<UidDoc>({
  uid: { type: String, required: true, unique: true },
  days: { type: Number, default: 30 },
  bluestack: { type: Boolean, default: true },
  addedBy: { type: String, default: "" },
  addedAt: { type: String, default: () => new Date().toISOString() },
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
  canResell: boolean;
  createdAt: string;
  defaultDays: number;
  isTrial: boolean;
  balance: number;
}

interface UserDoc extends AppUser, Document { }

const userSchema = new Schema<UserDoc>({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], default: "user" },
  createdAt: { type: String, default: () => new Date().toISOString() },
  defaultDays: { type: Number, default: 30 },
  isTrial: { type: Boolean, default: false },
  canResell: { type: Boolean, default: false },
  balance: { type: Number, default: 0 },
});

const UserModel = model<UserDoc>("User", userSchema);

let connected = false;

async function ensureConnection() {
  if (connected) return;
  try {
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
    });
    connected = true;
    logger.info("MongoDB connected");
    await seedAdmin();
  } catch (err) {
    connected = false;
    logger.error({ err }, "MongoDB connection failed — using fallback in-memory store");
  }
}

async function seedAdmin() {
  const exists = await UserModel.findOne({ role: "admin" });
  if (!exists) {
    await UserModel.create({
      username: config.ADMIN_USERNAME,
      password: config.ADMIN_PASSWORD,
      role: "admin",
      createdAt: new Date().toISOString(),
      defaultDays: 30,
      isTrial: false,
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
  canResell: false,
  createdAt: new Date().toISOString(),
  defaultDays: 30,
  isTrial: false,
  balance: 0,
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
      const user: AppUser = { username, password, role: "user", canResell: false, createdAt: new Date().toISOString(), defaultDays, isTrial, balance: 0 };
      fallbackUsers.set(username, user);
      return { ok: true, user };
    }
    const exists = await UserModel.findOne({ username });
    if (exists) return { ok: false, error: "Username already exists" };
    const user: AppUser = { username, password, role: "user", canResell: false, createdAt: new Date().toISOString(), defaultDays, isTrial, balance: 0 };
    await UserModel.create(user);
    return { ok: true, user };
  },

  async adjustBalance(username: string, amount: number): Promise<{ ok: boolean; balance: number }> {
    await ensureConnection();
    if (!connected) {
      const u = fallbackUsers.get(username);
      if (!u) return { ok: false, balance: 0 };
      u.balance = Math.max(0, (u.balance ?? 0) + amount);
      return { ok: true, balance: u.balance };
    }
    const doc = await UserModel.findOneAndUpdate(
      { username, role: "user" },
      { $inc: { balance: amount } },
      { new: true }
    );
    if (!doc) return { ok: false, balance: 0 };
    if (doc.balance < 0) {
      await UserModel.updateOne({ username }, { $set: { balance: 0 } });
      return { ok: true, balance: 0 };
    }
    return { ok: true, balance: doc.balance };
  },

  async deductBalance(username: string, cost: number): Promise<{ ok: boolean; balance: number; error?: string }> {
    await ensureConnection();
    if (!connected) {
      const u = fallbackUsers.get(username);
      if (!u) return { ok: false, balance: 0, error: "User not found" };
      if ((u.balance ?? 0) < cost) return { ok: false, balance: u.balance ?? 0, error: "INSUFFICIENT_BALANCE" };
      u.balance = (u.balance ?? 0) - cost;
      return { ok: true, balance: u.balance };
    }
    const doc = await UserModel.findOne({ username });
    if (!doc) return { ok: false, balance: 0, error: "User not found" };
    if ((doc.balance ?? 0) < cost) return { ok: false, balance: doc.balance ?? 0, error: "INSUFFICIENT_BALANCE" };
    const updated = await UserModel.findOneAndUpdate(
      { username, balance: { $gte: cost } },
      { $inc: { balance: -cost } },
      { new: true }
    );
    if (!updated) return { ok: false, balance: doc.balance ?? 0, error: "INSUFFICIENT_BALANCE" };
    return { ok: true, balance: updated.balance };
  },

  async setCanResell(username: string, canResell: boolean): Promise<boolean> {
    await ensureConnection();
    if (!connected) {
      const u = fallbackUsers.get(username);
      if (!u) return false;
      u.canResell = canResell;
      return true;
    }
    const result = await UserModel.updateOne({ username, role: "user" }, { $set: { canResell } });
    return result.modifiedCount > 0;
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
    username: doc.username,
    password: doc.password,
    role: doc.role,
    canResell: doc.canResell ?? false,
    createdAt: doc.createdAt,
    defaultDays: doc.defaultDays,
    isTrial: doc.isTrial,
    balance: doc.balance ?? 0,
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

// ── App settings model ──────────────────────────────────────────────────
interface SettingsDoc extends Document {
  key: string;
  externalApiUrl: string;
  externalApiKey: string;
}

const settingsSchema = new Schema<SettingsDoc>({
  key: { type: String, default: "main" },
  externalApiUrl: { type: String, default: "" },
  externalApiKey: { type: String, default: "" },
});

const SettingsModel = model<SettingsDoc>("AppSettings", settingsSchema);

let settingsCache: { externalApiUrl: string; externalApiKey: string } | null = null;

export const settingsStore = {
  async get(): Promise<{ externalApiUrl: string; externalApiKey: string }> {
    await ensureConnection();
    if (!connected) return { externalApiUrl: "", externalApiKey: "" };
    if (settingsCache) return settingsCache;
    const doc = await SettingsModel.findOne({ key: "main" });
    settingsCache = {
      externalApiUrl: doc?.externalApiUrl ?? "",
      externalApiKey: doc?.externalApiKey ?? "",
    };
    return settingsCache;
  },
  async update(data: { externalApiUrl?: string; externalApiKey?: string }): Promise<void> {
    await ensureConnection();
    if (!connected) return;
    await SettingsModel.updateOne({ key: "main" }, { $set: data }, { upsert: true });
    settingsCache = null;
  },
};

// ── Payment Request model ──────────────────────────────────────────────
export interface PaymentRequest {
  _id?: string;
  username: string;
  packageTokens: number;
  packagePrice: string;
  txNote: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface PaymentDoc extends Omit<PaymentRequest, "_id">, Document { }

const paymentSchema = new Schema<PaymentDoc>({
  username: { type: String, required: true },
  packageTokens: { type: Number, required: true },
  packagePrice: { type: String, required: true },
  txNote: { type: String, default: "" },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const PaymentModel = model<PaymentDoc>("PaymentRequest", paymentSchema);

const fallbackPayments: (PaymentRequest & { _id: string })[] = [];
let _payFallbackId = 0;

export const paymentStore = {
  async create(username: string, packageTokens: number, packagePrice: string, txNote: string): Promise<PaymentRequest> {
    await ensureConnection();
    const req: PaymentRequest = { username, packageTokens, packagePrice, txNote, status: "pending", createdAt: new Date().toISOString() };
    if (!connected) {
      const entry = { ...req, _id: String(++_payFallbackId) };
      fallbackPayments.push(entry);
      return entry;
    }
    const doc = await PaymentModel.create(req);
    return { ...req, _id: doc._id.toString() };
  },

  async list(): Promise<PaymentRequest[]> {
    await ensureConnection();
    if (!connected) return [...fallbackPayments].reverse();
    const docs = await PaymentModel.find({}).sort({ createdAt: -1 });
    return docs.map(d => ({ _id: d._id.toString(), username: d.username, packageTokens: d.packageTokens, packagePrice: d.packagePrice, txNote: d.txNote, status: d.status, createdAt: d.createdAt }));
  },

  async approve(id: string): Promise<PaymentRequest | null> {
    await ensureConnection();
    if (!connected) {
      const r = fallbackPayments.find(x => x._id === id);
      if (!r || r.status !== "pending") return null;
      r.status = "approved";
      return r;
    }
    const doc = await PaymentModel.findByIdAndUpdate(id, { status: "approved" }, { new: true });
    if (!doc) return null;
    return { _id: doc._id.toString(), username: doc.username, packageTokens: doc.packageTokens, packagePrice: doc.packagePrice, txNote: doc.txNote, status: doc.status, createdAt: doc.createdAt };
  },

  async reject(id: string): Promise<boolean> {
    await ensureConnection();
    if (!connected) {
      const r = fallbackPayments.find(x => x._id === id);
      if (!r) return false;
      r.status = "rejected";
      return true;
    }
    const res = await PaymentModel.findByIdAndUpdate(id, { status: "rejected" });
    return !!res;
  },
};

// Start connection immediately on import
ensureConnection().catch(() => { });
