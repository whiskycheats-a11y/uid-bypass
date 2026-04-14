export interface AppUser {
  username: string;
  password: string;
  role: "admin" | "user";
  createdAt: string;
  defaultDays: number;
  isTrial: boolean;
}

const trialUidCounts = new Map<string, number>();

export const trialStore = {
  getCount(username: string): number {
    return trialUidCounts.get(username) ?? 0;
  },
  increment(username: string): void {
    trialUidCounts.set(username, (trialUidCounts.get(username) ?? 0) + 1);
  },
};

const users = new Map<string, AppUser>();

const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
const adminPassword = process.env.ADMIN_PASSWORD ?? "UID@Admin2024";

users.set(adminUsername, {
  username: adminUsername,
  password: adminPassword,
  role: "admin",
  createdAt: new Date().toISOString(),
  defaultDays: 30,
  isTrial: false,
});

export const userStore = {
  find(username: string): AppUser | undefined {
    return users.get(username);
  },

  list(): AppUser[] {
    return Array.from(users.values()).filter((u) => u.role !== "admin");
  },

  add(
    username: string,
    password: string,
    defaultDays: number,
    isTrial = false,
  ): { ok: true; user: AppUser } | { ok: false; error: string } {
    if (users.has(username)) {
      return { ok: false, error: "Username already exists" };
    }
    const user: AppUser = {
      username,
      password,
      role: "user",
      createdAt: new Date().toISOString(),
      defaultDays,
      isTrial,
    };
    users.set(username, user);
    return { ok: true, user };
  },

  remove(username: string): boolean {
    const u = users.get(username);
    if (!u || u.role === "admin") return false;
    return users.delete(username);
  },

  verify(username: string, password: string): AppUser | null {
    const u = users.get(username);
    if (!u) return null;
    if (u.password !== password) return null;
    return u;
  },
};
