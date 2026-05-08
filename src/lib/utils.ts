import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Browser-safe UUID generator.
 *
 * `crypto.randomUUID()` is only available in secure contexts (https / localhost).
 * On-prem deployments served over plain http://<ip> do not have it, which crashes
 * the React tree. This helper falls back to `crypto.getRandomValues()` and finally
 * to a Math.random based ID, so it always returns a unique string.
 */
export function safeRandomId(): string {
  try {
    const c: any = typeof crypto !== "undefined" ? crypto : undefined;
    if (c && typeof c.randomUUID === "function") {
      return c.randomUUID();
    }
    if (c && typeof c.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      c.getRandomValues(bytes);
      // RFC 4122 v4
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-${Math.random().toString(16).slice(2, 10)}`;
}
