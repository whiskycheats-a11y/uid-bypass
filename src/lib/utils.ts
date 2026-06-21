import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function getDaysRemaining(expiresAt: Date | string | null): number {
  if (!expiresAt) return 0;
  const now = new Date();
  const exp = new Date(expiresAt);
  const diff = exp.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.substring(0, 4) + "••••••••••••" + key.substring(key.length - 4);
}

export function generateApiKey(): string {
  const chars = "abcdef0123456789";
  let result = "";
  const array = new Uint8Array(64);
  if (typeof crypto !== "undefined") {
    crypto.getRandomValues(array);
    for (let i = 0; i < 64; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 64; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return result;
}
