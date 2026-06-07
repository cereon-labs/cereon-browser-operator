/**
 * URL normalization for the navigate tool.
 *
 * Extracted as a pure function so the "prepend https://, but leave scheme URLs
 * alone" rule can be unit-tested without a browser.
 */

import { ValidationError } from "./errors";

const HAS_HTTP_SCHEME = /^https?:\/\//i;
const NON_HTTP_SCHEME = /^(about:|chrome:|brave:|edge:)/i;
const LEADING_GARBAGE_SCHEME = /^[a-z]{1,5}:\/+/i;

/**
 * Normalize a user-supplied navigation target into a loadable URL.
 *
 * - `about:`/`chrome:`/`brave:`/`edge:` URLs pass through untouched.
 * - `http(s)://…` passes through untouched.
 * - Anything else gets a stray scheme stripped and `https://` prepended.
 *
 * @throws {ValidationError} when the result is not a parseable URL.
 */
export function normalizeUrl(input: string): string {
  if (NON_HTTP_SCHEME.test(input)) return input;

  let target = input;
  if (!HAS_HTTP_SCHEME.test(target)) {
    target = target.replace(LEADING_GARBAGE_SCHEME, "");
    target = `https://${target}`;
  }

  try {
    // Validate; throws for genuinely malformed input.
    new URL(target);
  } catch {
    throw new ValidationError(`Invalid URL: "${input}". Could not parse as a valid URL.`);
  }

  return target;
}
