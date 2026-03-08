import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "./db";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await db.user.findFirst({
            where: {
              email: credentials.email as string,
            },
            include: {
              tenant: true,
            },
          });

          if (!user) {
            return null;
          }

          // Check account lockout
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            const remainingMs =
              user.lockedUntil.getTime() - Date.now();
            const remainingMin = Math.ceil(remainingMs / 60000);
            throw new Error(
              `ACCOUNT_LOCKED:${remainingMin}`
            );
          }

          // Verify password
          const isPasswordValid = await compare(
            credentials.password as string,
            user.passwordHash
          );

          if (!isPasswordValid) {
            // Increment failed attempts
            const newAttempts = user.failedLoginAttempts + 1;
            const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
              failedLoginAttempts: newAttempts,
            };

            // Lock account after MAX_FAILED_ATTEMPTS
            if (newAttempts >= MAX_FAILED_ATTEMPTS) {
              updateData.lockedUntil = new Date(
                Date.now() + LOCKOUT_DURATION_MS
              );
            }

            await db.user.update({
              where: { id: user.id },
              data: updateData,
            });

            if (newAttempts >= MAX_FAILED_ATTEMPTS) {
              throw new Error("ACCOUNT_LOCKED:15");
            }

            return null;
          }

          // Successful login - reset failed attempts
          if (user.failedLoginAttempts > 0 || user.lockedUntil) {
            await db.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
              },
            });
          }

          // Return user data with 2FA flag
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            tenantId: user.tenantId,
            tenantName: user.tenant.name,
            role: user.role,
            needsTwoFactor: user.totpEnabled,
            twoFactorVerified: false,
          };
        } catch (error: unknown) {
          if (error instanceof Error && error.message?.startsWith("ACCOUNT_LOCKED:")) {
            throw error;
          }
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as Record<string, unknown>;
        token.id = u.id;
        token.tenantId = u.tenantId;
        token.tenantName = u.tenantName;
        token.role = u.role;
        token.needsTwoFactor = u.needsTwoFactor ?? false;
        token.twoFactorVerified = u.twoFactorVerified ?? false;
      }
      // Allow updating 2FA verification status via session update
      if (trigger === "update" && session?.twoFactorVerified !== undefined) {
        token.twoFactorVerified = session.twoFactorVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const usr = session.user as unknown as Record<string, unknown>;
        usr.id = token.id as string;
        usr.tenantId = token.tenantId as string;
        usr.tenantName = token.tenantName as string;
        usr.role = token.role as string;
        usr.needsTwoFactor = token.needsTwoFactor as boolean;
        usr.twoFactorVerified = token.twoFactorVerified as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
