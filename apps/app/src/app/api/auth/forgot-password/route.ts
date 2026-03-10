import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/server/services/email.service";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed, resetIn } = await checkRateLimit(`forgot-password:${ip}`, 3, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: `Zu viele Anfragen. Versuchen Sie es in ${resetIn} Sekunden erneut.` },
        { status: 429 }
      );
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "E-Mail ist erforderlich" },
        { status: 400 }
      );
    }

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({
      message: "Falls ein Account mit dieser E-Mail existiert, wurde ein Reset-Link versendet.",
    });

    const user = await db.user.findFirst({ where: { email } });
    if (!user) {
      return successResponse;
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expires,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "https://app.propgate.de";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    if (process.env.NODE_ENV === "development") {
      console.log(`[Password Reset] Link for ${email}: ${resetUrl}`);
    }

    const emailResult = await sendPasswordResetEmail(email, resetUrl);
    if (!emailResult.success) {
      console.error("Failed to send password reset email:", emailResult.error);
    }

    return successResponse;
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}
