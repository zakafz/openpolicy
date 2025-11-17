import { CustomerPortal } from "@polar-sh/nextjs";

const polarServer = (() => {
  const s = process.env.POLAR_SERVER;
  return s === "sandbox" || s === "production" ? s : undefined;
})();

export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  returnUrl:
    polarServer === "sandbox"
      ? "http://localhost:3000/dashboard"
      : "https://openpolicyhq.com/dashboard",
  getCustomerId: async (req) => {
    try {
      const url = new URL("/api/polar/customer", req.url).toString();
      const cookie = req.headers.get("cookie") ?? "";
      const res = await fetch(url, {
        method: "GET",
        headers: {
          cookie,
        },
      });
      if (!res.ok) {
        return null;
      }
      const body = await res.json().catch(() => null);
      const customerId =
        body?.customerId ??
        body?.customer?.id ??
        body?.customer?.customerId ??
        null;
      return customerId ?? null;
    } catch (err) {
      console.error("Error resolving Polar customer for portal:", err);
      return null;
    }
  },
  server: "sandbox",
});
