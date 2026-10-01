import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { hashPassword, verifyPassword, verifySession } from "@/lib/auth";
import User from "@/models/User";

export async function POST(request: Request) {
  const token = (await cookies()).get("constructflow_session")?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    return NextResponse.json({ error: "You are not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new passwords are required." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "New password must be different from the current password." }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(session.id);

  if (!user || !user.active) {
    return NextResponse.json({ error: "Your account is no longer active." }, { status: 403 });
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  user.passwordHash = hashPassword(newPassword);
  await user.save();

  return NextResponse.json({ success: true });
}
