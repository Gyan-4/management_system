import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { verifyPassword, signSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

    await connectDB();
    const user = await User.findOne({ email }).lean();
    if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const response = NextResponse.json({
      user: { id: String(user._id), name: user.name, email: user.email, role: user.role },
    });
    response.cookies.set("constructflow_session", signSession({ id: String(user._id), role: user.role, name: user.name }), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error("POST /api/auth/login", error);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
