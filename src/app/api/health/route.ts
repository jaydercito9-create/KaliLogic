import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "kalilogic-web",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
