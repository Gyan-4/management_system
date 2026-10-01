import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";
import mongoose from "mongoose";

async function requireAdmin() {
  const token = (await cookies()).get("constructflow_session")?.value;
  const session = token ? verifySession(token) : null;
  return session?.role === "Admin" ? session : null;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  try {
    const connection = await connectDB();
    const collections = await connection.connection.db?.listCollections().toArray();
    return NextResponse.json({
      ok: true,
      database: connection.connection.db?.databaseName || "construction_management",
      state: connection.connection.readyState === 1 ? "connected" : "disconnected",
      collections: (collections || []).map((collection) => collection.name).sort(),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/settings/database", error);
    return NextResponse.json(
      {
        ok: false,
        database: process.env.MONGODB_DB_NAME || "construction_management",
        state: mongoose.connection.readyState === 1 ? "connected" : "error",
        error: "Could not connect to the configured MongoDB database.",
      },
      { status: 500 },
    );
  }
}
