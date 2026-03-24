import {
  GetExperimentMetricsParamsSchema,
  GetExperimentParamsSchema,
  GetExperimentVariantsParamsSchema,
  ListExperimentsParamsSchema,
} from "@iterable/api";

import type { CommandDefinition } from "./types.js";
import { defineCommand } from "./types.js";

export const experimentCommands: CommandDefinition[] = [
  defineCommand({
    category: "experiments",
    name: "list",
    description:
      "List experiments with optional filtering by campaign, status, and date range",
    clientMethod: "listExperiments",
    schema: ListExperimentsParamsSchema,
  }),
  defineCommand({
    category: "experiments",
    name: "get",
    description: "Get detailed information about a specific experiment by ID",
    clientMethod: "getExperiment",
    schema: GetExperimentParamsSchema,
  }),
  defineCommand({
    category: "experiments",
    name: "get-metrics",
    description: "Get experiment metrics for A/B testing analysis",
    clientMethod: "getExperimentMetrics",
    schema: GetExperimentMetricsParamsSchema,
  }),
  defineCommand({
    category: "experiments",
    name: "get-variants",
    description:
      "Get variant content for an experiment, including subject lines, preheaders, HTML source, and plain text",
    clientMethod: "getExperimentVariants",
    schema: GetExperimentVariantsParamsSchema,
  }),
];
