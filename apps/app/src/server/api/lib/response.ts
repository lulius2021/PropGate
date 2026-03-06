/**
 * REST API response helpers
 *
 * Consistent envelope format for all API responses:
 * Success: { ok: true, data, pagination? }
 * Error: { ok: false, error: { code, message, details? } }
 */

import { ZodError } from "zod";
import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function successResponse<T>(
  data: T,
  pagination?: PaginationMeta,
  status: number = 200
) {
  const body: { ok: true; data: T; pagination?: PaginationMeta } = {
    ok: true,
    data,
  };
  if (pagination) {
    body.pagination = pagination;
  }
  return NextResponse.json(body, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Ungültige Eingabedaten",
          details: error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
      },
      { status: 400 }
    );
  }

  console.error("Unhandled API error:", error);
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Ein interner Fehler ist aufgetreten",
      },
    },
    { status: 500 }
  );
}
