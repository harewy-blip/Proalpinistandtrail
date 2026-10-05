import { NextResponse } from "next/server";
import { intervalsStatus, sendWorkout } from "@/lib/intervals/sendWorkout";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(intervalsStatus());
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const r = await sendWorkout(payload, req.headers.get("x-app-passcode"));
  return NextResponse.json(r.body, { status: r.status });
}
