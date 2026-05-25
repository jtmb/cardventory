import { NextRequest, NextResponse } from "next/server";
import { resolveMx } from "dns/promises";

export async function POST(req: NextRequest) {
  let email: string;
  try {
    const body = await req.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json({ exists: false }, { status: 400 });
  }

  const atIndex = email.lastIndexOf("@");
  if (atIndex < 1) {
    return NextResponse.json({ exists: false }, { status: 400 });
  }

  const domain = email.slice(atIndex + 1);
  if (!domain) {
    return NextResponse.json({ exists: false }, { status: 400 });
  }

  try {
    const records = await resolveMx(domain);
    return NextResponse.json({ exists: records.length > 0 });
  } catch {
    // ENOTFOUND, ENODATA, etc. — domain has no MX records or doesn't exist
    return NextResponse.json({ exists: false });
  }
}
