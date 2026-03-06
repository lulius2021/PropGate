/**
 * Pagination utilities for REST API
 */

import type { PaginationMeta } from "./response";

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order: "asc" | "desc";
  cursor?: string;
}

/**
 * Parse pagination params from URL search params
 */
export function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20)
  );
  const sort = searchParams.get("sort") || undefined;
  const order =
    searchParams.get("order") === "asc" ? ("asc" as const) : ("desc" as const);
  const cursor = searchParams.get("cursor") || undefined;

  return { page, limit, sort, order, cursor };
}

/**
 * Convert pagination params to Prisma skip/take
 */
export function paginateQuery(params: PaginationParams): {
  skip: number;
  take: number;
  orderBy?: Record<string, "asc" | "desc">;
} {
  const skip = (params.page - 1) * params.limit;
  const take = params.limit;
  const orderBy = params.sort
    ? { [params.sort]: params.order }
    : { createdAt: params.order };

  return { skip, take, orderBy };
}

/**
 * Build pagination metadata from total count
 */
export function buildPaginationMeta(
  total: number,
  params: PaginationParams
): PaginationMeta {
  const totalPages = Math.ceil(total / params.limit);
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
    hasMore: params.page < totalPages,
  };
}
