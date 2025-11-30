import { NextResponse } from "next/server";
import { api as polar } from "@/lib/polar";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const authId = String(user.id);

    try {
      const res: any = await polar.customers.getExternal({
        externalId: authId,
      });

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
