import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.INTERNAL_API_SECRET;

  if (!secret) {
    console.error("INTERNAL_API_SECRET not defined in environment");
    return NextResponse.json(
      { error: "Server Configuration Error" },
      { status: 500 },
    );
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 },
    );
  }

  const token = authHeader.split(" ")[1];

  if (token !== secret) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  return NextResponse.json({ status: "authorized" });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
