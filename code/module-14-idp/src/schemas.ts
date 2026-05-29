import { z } from "zod";

export const LineItem = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  total: z.number(),
});

export type LineItem = z.infer<typeof LineItem>;

export const InvoiceExtraction = z.object({
  vendor: z.string(),
  invoice_number: z.string(),
  date: z.string(),
  line_items: z.array(LineItem),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  currency: z.string(),
  confidence: z.number().min(0).max(1),
});

export type InvoiceExtraction = z.infer<typeof InvoiceExtraction>;

export const ValidationResult = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type ValidationResult = z.infer<typeof ValidationResult>;
