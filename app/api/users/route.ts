import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { hashPassword, verifySession } from "@/lib/auth";
import User from "@/models/User";
import Project from "@/models/Project";

async function requireAdmin() {
  const token = (await cookies()).get("constructflow_session")?.value;
  const session = token ? verifySession(token) : null;
  return session?.role === "Admin" ? session : null;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  await connectDB();
  const users = await User.find({})
    .select("_id name email role active createdAt updatedAt")
    .sort({ name: 1 })
    .lean();

  return NextResponse.json({
    users: users.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = body?.role;

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "A valid name is required." }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (!["Admin", "Project Manager", "Engineer"].includes(role)) {
    return NextResponse.json({ error: "Invalid user role." }, { status: 400 });
  }

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    return NextResponse.json({ error: "That email address is already registered." }, { status: 409 });
  }

  const user = await User.create({
    name,
    email,
    passwordHash: hashPassword(password),
    role,
    active: true,
  });

  return NextResponse.json(
    {
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
      },
    },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body?.role;
  const active = body?.active;
  const password = typeof body?.password === "string" ? body.password : "";

  if (!id || !/^[a-f0-9]{24}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
  }
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "A valid name is required." }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }
  if (!["Admin", "Project Manager", "Engineer"].includes(role)) {
    return NextResponse.json({ error: "Invalid user role." }, { status: 400 });
  }
  if (typeof active !== "boolean") {
    return NextResponse.json({ error: "Active status is required." }, { status: 400 });
  }
  if (password && password.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  await connectDB();

  const user = await User.findById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const emailOwner = await User.findOne({ email, _id: { $ne: user._id } });
  if (emailOwner) {
    return NextResponse.json({ error: "That email address is already registered." }, { status: 409 });
  }

  if (String(user._id) === session.id && (!active || role !== "Admin")) {
    return NextResponse.json(
      { error: "You cannot deactivate or remove administrator access from your own account." },
      { status: 400 },
    );
  }

  if (user.role === "Admin" && (role !== "Admin" || !active)) {
    const adminCount = await User.countDocuments({ role: "Admin", active: true });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "At least one active administrator must remain." },
        { status: 400 },
      );
    }
  }

  user.name = name;
  user.email = email;
  user.role = role;
  user.active = active;
  if (password) user.passwordHash = hashPassword(password);
  await user.save();

  return NextResponse.json({
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
    },
  });
}
