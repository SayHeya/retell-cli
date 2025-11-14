/**
 * Common types used across the application
 */

/**
 * Result type for operations that can fail
 * Use this instead of throwing exceptions for expected failures
 */
export type Result<T, E = Error> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E };

/**
 * Create a successful result
 */
export const Ok = <T>(value: T): Result<T, never> => ({
  success: true,
  value,
});

/**
 * Create an error result
 */
export const Err = <E>(error: E): Result<never, E> => ({
  success: false,
  error,
});

/**
 * Type guard for successful results
 */
export function isOk<T, E>(result: Result<T, E>): result is { success: true; value: T } {
  return result.success === true;
}

/**
 * Type guard for error results
 */
export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false;
}

/**
 * Unwrap a result, throwing if it's an error
 * Use sparingly - prefer pattern matching with isOk/isErr
 */
export function unwrap<T, E extends Error>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  // At this point, TypeScript knows result is Err type
  const err = result as { readonly success: false; readonly error: E };
  throw err.error;
}

/**
 * Branded type helpers for nominal typing
 */
export type Brand<K, T> = K & { readonly __brand: T };

/**
 * Hash type for SHA-256 hashes
 */
export type Hash = Brand<string, 'Hash'>;

/**
 * Timestamp type for ISO 8601 timestamps
 */
export type Timestamp = Brand<string, 'Timestamp'>;

/**
 * Create a hash from a string
 */
export const createHash = (hash: string): Hash => hash as Hash;

/**
 * Create a timestamp from a string
 */
export const createTimestamp = (timestamp: string): Timestamp => timestamp as Timestamp;

/**
 * Create a timestamp for the current time
 */
export const now = (): Timestamp => new Date().toISOString() as Timestamp;
