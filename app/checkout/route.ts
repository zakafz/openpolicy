import { Checkout } from "@polar-sh/nextjs";

const polarServer = (() => {
  const s = process.env.POLAR_SERVER;
  return s === "development" || s === "production" ? s : undefined;
})();

export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  successUrl:
    polarServer === "development"
      ? "http://localhost:3000/success?checkout_id={CHECKOUT_ID}"
      : "https://openpolicyhq.com/success?checkout_id={CHECKOUT_ID}",
  server: "production",
  theme: "light",
});
