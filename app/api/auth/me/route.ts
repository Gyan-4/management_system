import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const token = (await cookies()).get("constructflow_session")?.value;
  const session = token ? verifySession(token) : null;
  return NextResponse.json({ authenticated: !!session, user: session || null });
}
