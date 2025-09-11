/**
 * ULID utilities for generating unique identifiers
 * ULIDs are lexicographically sortable and timestamp-based
 */

import { ulid } from 'ulid';

/**
 * Generate a new ULID
 *
 * @returns New ULID string
 *
 * @example
 * ```typescript
 * const appointmentId = generateUlid();
 * console.log(appointmentId); // "01H0000000000000000000"
 * ```
 */
export const generateUlid = (): string => {
  return ulid();
};

/**
 * Generate ULID with timestamp
 *
 * @param timestamp - Optional timestamp (defaults to now)
 * @returns ULID string based on timestamp
 *
 * @example
 * ```typescript
 * const pastId = generateUlidWithTimestamp(Date.now() - 86400000); // 1 day ago
 * ```
 */
export const generateUlidWithTimestamp = (timestamp?: number): string => {
  return ulid(timestamp);
};

/**
 * Validate if string is a valid ULID format
 *
 * @param value - String to validate
 * @returns True if valid ULID format
 *
 * @example
 * ```typescript
 * const isValid = isValidUlid("01H0000000000000000000");
 * console.log(isValid); // true
 * ```
 */
export const isValidUlid = (value: string): boolean => {
  const ulidRegex = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;
  return ulidRegex.test(value);
};

/**
 * Extract timestamp from ULID
 *
 * @param ulidValue - ULID string
 * @returns Timestamp in milliseconds
 *
 * @example
 * ```typescript
 * const timestamp = extractTimestampFromUlid("01H0000000000000000000");
 * const date = new Date(timestamp);
 * ```
 */
export const extractTimestampFromUlid = (ulidValue: string): number => {
  if (!isValidUlid(ulidValue)) {
    throw new Error('Invalid ULID format');
  }

  // ULID timestamp is encoded in the first 10 characters
  const timeChars = ulidValue.substring(0, 10);

  // Crockford's Base32 decoding for timestamp part
  const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let timestamp = 0;

  for (const char of timeChars) {
    const value = ENCODING.indexOf(char);
    timestamp = timestamp * 32 + value;
  }

  return timestamp;
};
