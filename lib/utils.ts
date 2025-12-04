import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

export function fmtAbsolute(date?: string | null) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleString();
  } catch {
    return String(date);
  }
}

export function getHostSubdomain(hostname?: string): string | null {
  if (!hostname) return null;
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname))
    return null;
  const parts = hostname.split(".");
  if (parts.length < 3) return null;
  return parts[0] ?? null;
}

export function splitPathname(pathname?: string): string[] {
  if (!pathname) return [];
  return pathname.split("/").filter(Boolean);
}

export function resolveWorkspaceFromRequest(options: {
  hostname?: string;
  pathname?: string;
  workspaceSlug?: string | null;
}): {
  mode: "subdomain" | "path" | "none";
  workspaceSlug: string | null;
  documentSlug: string | null;
} {
  const { hostname, pathname, workspaceSlug } = options;
  const sub = getHostSubdomain(hostname ?? undefined);
  const parts = splitPathname(pathname);
  if (sub && workspaceSlug && String(sub) === String(workspaceSlug)) {
    const doc = parts.length >= 1 ? parts[0] : null;
    return { mode: "subdomain", workspaceSlug, documentSlug: doc };
  }
  if (parts.length === 0) {
    return {
      mode: "path",
      workspaceSlug: workspaceSlug ?? null,
      documentSlug: null,
    };
  }
  if (workspaceSlug && parts[0] === workspaceSlug) {
    const doc = parts.length >= 2 ? parts[1] : null;
    return { mode: "path", workspaceSlug, documentSlug: doc };
  }
  const doc = parts.length >= 1 ? parts[0] : null;
  return {
    mode: "none",
    workspaceSlug: workspaceSlug ?? null,
    documentSlug: doc,
  };
}

export function buildDocumentUrl(options: {
  workspaceSlug?: string | null;
  documentSlug?: string | null;
  useSubdomain?: boolean;
  origin?: string | null;
}): string {
  const { workspaceSlug, documentSlug, useSubdomain, origin } = options;
  const slug = documentSlug ?? "";
  if (useSubdomain && workspaceSlug && origin) {
    try {
      const url = new URL(origin);
      const hostParts = url.hostname.split(".");
      if (hostParts.length >= 2) {
        hostParts[0] = String(workspaceSlug);
        url.hostname = hostParts.join(".");
        url.pathname = `/${slug}`;
        return url.toString();
      }
    } catch {
      // fallback to path-based URL
    }
  }
  if (workspaceSlug) {
    return `/${workspaceSlug}/${slug}`;
  }
  return `/${slug}`;
}
export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}
