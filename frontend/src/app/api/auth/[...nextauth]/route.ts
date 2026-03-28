import { handlers } from "@/lib/auth";
import { ratelimit } from "@/lib/ratelimit";
import { NextRequest, NextResponse } from "next/server";

export const GET = handlers.GET;

export const POST = async (req: NextRequest) => {
    const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
    const { success } = await ratelimit.limit(`auth:${ip}`);

    if (!success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    return handlers.POST(req);
};
