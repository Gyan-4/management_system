import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import CompanySettings from "@/models/CompanySettings";

export async function GET() {
  try {
    await connectDB();
    const settings = await CompanySettings.findOne({ key: "default" }).lean();
    return NextResponse.json(
      settings || { key: "default", name: "", address: "", engineer: "", contact: "" }
    );
  } catch (error) {
    console.error("GET /api/settings", error);
    return NextResponse.json({ error: "Failed to load settings." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const values = {
      name: String(body?.name || "").trim(),
      address: String(body?.address || "").trim(),
      engineer: String(body?.engineer || "").trim(),
      contact: String(body?.contact || "").trim(),
    };

    await connectDB();
    const settings = await CompanySettings.findOneAndUpdate(
      { key: "default" },
      { $set: values, $setOnInsert: { key: "default" } },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    return NextResponse.json(settings);
  } catch (error) {
    console.error("PUT /api/settings", error);
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
