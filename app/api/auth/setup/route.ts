import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword, signSession } from "@/lib/auth";

export async function GET() {
  await connectDB();
  const count = await User.countDocuments();
  return NextResponse.json({ setupRequired: count === 0 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await connectDB();
    if (await User.exists({})) return NextResponse.json({ error: "Initial setup has already been completed." }, { status: 409 });

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    if (!name || !email || password.length < 8) {
      return NextResponse.json({ error: "Name, email, and a password of at least 8 characters are required." }, { status: 400 });
    }

    const user = await User.create({ name, email, passwordHash: hashPassword(password), role: "Admin", active: true });
    const response = NextResponse.json({ user: { id: String(user._id), name: user.name, email: user.email, role: user.role } }, { status: 201 });
    response.cookies.set("constructflow_session", signSession({ id: String(user._id), role: user.role, name: user.name }), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error("POST /api/auth/setup", error);
    return NextResponse.json({ error: "Could not create the administrator account." }, { status: 500 });
  }
}
