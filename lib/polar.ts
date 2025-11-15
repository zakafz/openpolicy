import { Polar } from "@polar-sh/sdk";

const polarServer = (() => {
  const s = process.env.POLAR_SERVER;
  return s === "sandbox" || s === "production" ? s : undefined;
})();

export const api = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: polarServer,
});
