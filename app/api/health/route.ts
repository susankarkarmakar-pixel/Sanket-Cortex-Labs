import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "susan-ai", timestamp: new Date().toISOString() });
}
