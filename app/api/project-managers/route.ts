import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";
import User from "@/models/User";

export async function GET() {
  const token = (await cookies()).get("constructflow_session")?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  await connectDB();
  const users = await User.find({
    role: "Project Manager",
    active: true,
  })
    .select("_id name email role")
    .sort({ name: 1 })
    .lean();

  return NextResponse.json({
    users: users.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
    })),
  });
}
