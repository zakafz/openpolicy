import { CustomerPortal } from "@polar-sh/nextjs";

export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  getCustomerId: async (req) => 'b1c2ad26-c7ef-43e8-94d6-6e09ad3d37ad',
  server: 'sandbox',
});