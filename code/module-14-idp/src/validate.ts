import type { InvoiceExtraction } from "./schemas.js";
import type { ValidationResult } from "./schemas.js";

// ISO 4217 codes we recognise — extend as needed.
const KNOWN_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "CNY", "INR", "MXN",
  "BRL", "SGD", "HKD", "NOK", "SEK", "DKK", "NZD", "ZAR", "AED", "THB",
]);

// Tolerance for floating-point math on monetary amounts (1%).
const TOLERANCE = 0.01;

function withinTolerance(actual: number, expected: number): boolean {
  if (expected === 0) return actual === 0;
  return Math.abs(actual - expected) / Math.abs(expected) <= TOLERANCE;
}

export function validateExtraction(e: InvoiceExtraction): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Confidence bounds (schema enforces 0–1 already, but belt-and-suspenders).
  if (e.confidence < 0 || e.confidence > 1) {
    errors.push(`confidence ${e.confidence} is outside [0, 1]`);
  }

  // Date parseability.
  if (!e.date || isNaN(Date.parse(e.date))) {
    warnings.push(`date "${e.date}" is not a recognisable date format`);
  }

  // Currency validity.
  const currencyUpper = e.currency.toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyUpper)) {
    errors.push(`currency "${e.currency}" is not a valid 3-letter code`);
  } else if (!KNOWN_CURRENCIES.has(currencyUpper)) {
    warnings.push(`currency "${e.currency}" is not in the recognised list — verify it is correct`);
  }

  // Line items sum vs subtotal.
  if (e.line_items.length === 0) {
    warnings.push("no line items were extracted");
  } else {
    const lineSum = e.line_items.reduce((acc, item) => acc + item.total, 0);
    if (!withinTolerance(lineSum, e.subtotal)) {
      errors.push(
        `line items sum (${lineSum.toFixed(2)}) does not match subtotal (${e.subtotal.toFixed(2)}) within 1%`,
      );
    }

    // Per-item sanity: quantity * unitPrice ≈ total.
    for (const [i, item] of e.line_items.entries()) {
      const expected = item.quantity * item.unitPrice;
      if (expected !== 0 && !withinTolerance(item.total, expected)) {
        warnings.push(
          `line item ${i + 1} ("${item.description}"): qty × unitPrice (${expected.toFixed(2)}) ≠ total (${item.total.toFixed(2)})`,
        );
      }
    }
  }

  // subtotal + tax ≈ total.
  const computedTotal = e.subtotal + e.tax;
  if (!withinTolerance(computedTotal, e.total)) {
    errors.push(
      `subtotal + tax (${computedTotal.toFixed(2)}) does not match total (${e.total.toFixed(2)}) within 1%`,
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}
