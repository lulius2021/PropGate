import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { verifyTOTP, decryptSecret, verifyRecoveryCode } from "@/lib/totp";
import { encode } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const { code, isRecoveryCode } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: "Code ist erforderlich" },
        { status: 400 }
      );
    }

    const userId = (session.user as { id: string }).id;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        totpSecret: true,
        totpEnabled: true,
        recoveryCodes: true,
      },
    });

    if (!user?.totpEnabled || !user?.totpSecret) {
      return NextResponse.json(
        { error: "2FA ist nicht aktiviert" },
        { status: 400 }
      );
    }

    let isValid = false;

    if (isRecoveryCode) {
      // Verify recovery code
      if (!user.recoveryCodes) {
        return NextResponse.json(
          { error: "Keine Wiederherstellungscodes vorhanden" },
          { status: 400 }
        );
      }

      const result = await verifyRecoveryCode(code, user.recoveryCodes);
      isValid = result.valid;

      if (isValid) {
        // Update remaining recovery codes
        await db.user.update({
          where: { id: userId },
          data: { recoveryCodes: result.remainingCodes },
        });
      }
    } else {
      // Verify TOTP code
      const decryptedSecret = decryptSecret(user.totpSecret);
      isValid = verifyTOTP(decryptedSecret, code);
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Ungültiger Code" },
        { status: 400 }
      );
    }

    // Update the JWT token to mark 2FA as verified
    // We need to create a new token with twoFactorVerified = true
    const token = await encode({
      token: {
        id: userId,
        email: session.user.email,
        name: session.user.name,
        tenantId: (session.user as { tenantId: string }).tenantId,
        tenantName: (session.user as { tenantName: string }).tenantName,
        role: (session.user as { role: string }).role,
        needsTwoFactor: true,
        twoFactorVerified: true,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      salt:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
    });

    // Set the new session cookie
    const cookieName =
      process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token";

    const response = NextResponse.json({ success: true });
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("2FA verification error:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}
