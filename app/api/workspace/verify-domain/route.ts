import { resolveCname } from "dns/promises";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { domain } = await req.json();

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 },
      );
    }

    if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
      return NextResponse.json(
        { valid: false, message: "Invalid domain format" },
        { status: 200 },
      );
    }

    try {
      const cnames = await resolveCname(domain);
      const target = "cname.openpolicyhq.com";

      const isValid = cnames.some((cname) => cname === target);

      if (isValid) {
        return NextResponse.json({
          valid: true,
          message: "Domain is correctly configured",
        });
      } else {
        return NextResponse.json({
          valid: false,
          message: `CNAME record points to ${cnames.join(", ")} instead of ${target}`,
        });
      }
    } catch (error: any) {
      if (error.code === "ENODATA" || error.code === "ENOTFOUND") {
        return NextResponse.json({
          valid: false,
          message: "No CNAME record found for this domain",
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Domain verification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify domain" },
      { status: 500 },
    );
  }
}
