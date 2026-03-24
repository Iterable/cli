import { z } from "zod";

import { ValidationError } from "../errors.js";
import type { CliTransform } from "./types.js";

export const sortTransform: CliTransform = {
  cliFields: {
    sort: z.string().optional().describe("Field to sort by"),
    order: z
      .enum(["asc", "desc"])
      .optional()
      .describe("Sort direction (asc or desc)"),
  },
  toParam: (values: Record<string, unknown>) => {
    if (!values.sort) return undefined;
    const direction = values.order as string | undefined;
    if (direction && !["asc", "desc"].includes(direction)) {
      throw new ValidationError(
        `Invalid sort direction: ${direction} (use asc or desc)`
      );
    }
    return {
      field: values.sort,
      ...(direction ? { direction } : {}),
    };
  },
};
