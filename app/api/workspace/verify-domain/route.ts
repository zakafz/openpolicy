import dns from "node:dns";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

const resolveCname = promisify(dns.resolveCname);

export async function POST(req: Request) {
  try {
    const { domain } = await req.json();

    if (!domain) {
      return NextResponse.json(
        { valid: false, message: "Domain is required" },
        { status: 400 },
      );
    }

    try {
      const cnames = await resolveCname(domain);
      const target = "cname.openpolicyhq.com";

      if (cnames.some((cname) => cname === target)) {
        return NextResponse.json({ valid: true, message: "Domain is valid" });
      } else {
        return NextResponse.json({
          valid: false,
          message: `Domain CNAME does not point to ${target}`,
        });
      }
    } catch (error: any) {
      console.error("DNS lookup error:", error);
      // DNS resolution failed or no CNAME record found
      return NextResponse.json({
        valid: false,
        message:
          "Could not verify domain configuration. Please check your DNS settings.",
      });
    }
  } catch (error) {
    console.error("Verify domain error:", error);
    return NextResponse.json(
      { valid: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
