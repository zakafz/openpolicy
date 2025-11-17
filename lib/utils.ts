import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Simple human-friendly relative time (e.g. "12 minutes ago", "3 hours ago")
export function timeAgo(date?: string | null) {
  if (!date) return "";
  const then = new Date(date).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  const d = Math.floor(diffSec / 86400);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

// Helper: absolute/relative formatting
export function fmtAbsolute(date?: string | null) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleString();
  } catch {
    return String(date);
  }
}