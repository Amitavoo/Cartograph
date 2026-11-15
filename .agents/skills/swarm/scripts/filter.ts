import type { SwarmFilter } from "./types.js";
import { readColumn } from "./utils.js";

/**
 * Compare two values for deep equality.
 *
 * Handles primitives via `===` and objects/arrays via JSON
 * serialization. `null` and `undefined` only equal themselves.
 *
 * @param a - First value.
 * @param b - Second value.
 * @returns `true` if the values are deeply equal.
 */
function deepEquals(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (a == null || b == null) {
    return false;
  }

  if (typeof a !== "object" || typeof b !== "object") {
    return false;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEquals(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) {
      return false;
    }
    if (!deepEquals(objA[key], objB[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluate a filter clause against a single table row.
 *
 * Supports leaf predicates (`equals`, `notEquals`, `in`, `exists`)
 * and recursive combinators (`and`, `or`). Column paths support
 * dot notation for nested access.
 *
 * @param filter - The filter clause to evaluate.
 * @param row - The table row to test against.
 * @returns `true` if the row matches the filter.
 */
export function evaluateFilter(
  filter: SwarmFilter,
  row: Record<string, unknown>,
): boolean {
  if (filter == null || typeof filter !== "object") {
    throw new Error(
      `evaluateFilter: expected a filter object, got ${JSON.stringify(filter)}`,
    );
  }

  if ("and" in filter) {
    return filter.and.every((f) => evaluateFilter(f, row));
  }

  if ("or" in filter) {
    return filter.or.some((f) => evaluateFilter(f, row));
  }

  const value = readColumn(row, filter.column);

  if ("equals" in filter) {
    return deepEquals(value, filter.equals);
  }

  if ("notEquals" in filter) {
    return !deepEquals(value, filter.notEquals);
  }

  if ("in" in filter) {
    return filter.in.some((item) => deepEquals(value, item));
  }

  if ("exists" in filter) {
    return filter.exists ? value != null : value == null;
  }

  return false;
}
