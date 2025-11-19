import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { api as polar } from "@/lib/polar";

// GET /api/polar/customer — return Polar customer for authenticated Supabase user
export async function GET(req: Request) {
  try {
    // server-side Supabase client (reads cookies)
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Ensure we pass a string to Polar SDK
    const authId = String(user.id);

    try {
      // Polar SDK: getExternal expects { externalId: string }
      const res: any = await polar.customers.getExternal({
        externalId: authId,
      });

      // Normalize result: SDK might return object directly or nested
      const customer = res?.data ?? res;

      if (!customer) {
        return NextResponse.json({}, { status: 404 });
      }

      return NextResponse.json(
        {
          customerId: customer.id ?? customer.customerId ?? null,
          externalId: customer.externalId ?? customer.external_id ?? null,
          customer,
        },
        { status: 200 },
      );
    } catch (err: any) {
      const status = err?.statusCode ?? err?.status ?? 500;
      // If Polar returns 404 for nonexistent external customer
      if (status === 404) {
        return NextResponse.json({}, { status: 404 });
      }
      console.error("Polar lookup error:", err);
      return NextResponse.json(
        { error: "Polar lookup error" },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("Server error in /api/polar/customer:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
