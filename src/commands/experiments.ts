import {
  CopyExperimentVariantParamsSchema,
  CreateExperimentParamsSchema,
  DeclareExperimentWinnerParamsSchema,
  ExperimentIdParamsSchema,
  GetExperimentMetricsParamsSchema,
  GetExperimentParamsSchema,
  GetExperimentTrendsParamsSchema,
  GetExperimentVariantsParamsSchema,
  ListExperimentsParamsSchema,
  UpdateExperimentSettingsParamsSchema,
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
  defineCommand({
    category: "experiments",
    name: "get-totals",
    description:
      "Get lifetime send and conversion totals for a campaign experiment",
    clientMethod: "getExperimentTotals",
    schema: ExperimentIdParamsSchema,
  }),
  defineCommand({
    category: "experiments",
    name: "get-trends",
    description:
      "Get the performance time series for a campaign experiment. Provide both start and end times, or omit both to use the run window.",
    clientMethod: "getExperimentTrends",
    schema: GetExperimentTrendsParamsSchema,
  }),
  defineCommand({
    category: "experiments",
    name: "create",
    description:
      "Create a draft campaign experiment. The campaign template becomes the control.",
    clientMethod: "createExperiment",
    schema: CreateExperimentParamsSchema,
  }),
  defineCommand({
    category: "experiments",
    name: "copy-variant",
    description:
      "Copy a template into a new variant on a draft or ready campaign experiment",
    clientMethod: "copyExperimentVariant",
    schema: CopyExperimentVariantParamsSchema,
  }),
  defineCommand({
    category: "experiments",
    name: "update-settings",
    description:
      "Update settings on a draft or ready campaign experiment. Omit a field to leave it unchanged.",
    clientMethod: "updateExperimentSettings",
    schema: UpdateExperimentSettingsParamsSchema,
  }),
  defineCommand({
    category: "experiments",
    name: "start",
    description: "Start a draft or ready campaign experiment",
    clientMethod: "startExperiment",
    schema: ExperimentIdParamsSchema,
  }),
  defineCommand({
    category: "experiments",
    name: "cancel",
    description:
      "Cancel a running or winner-found campaign experiment without declaring a winner",
    clientMethod: "cancelExperiment",
    schema: ExperimentIdParamsSchema,
  }),
  defineCommand({
    category: "experiments",
    name: "declare-winner",
    description:
      "Declare a winning variant and end a running or winner-found campaign experiment",
    clientMethod: "declareExperimentWinner",
    schema: DeclareExperimentWinnerParamsSchema,
  }),
  defineCommand({
    category: "experiments",
    name: "delete",
    description: "Delete a draft, ready, or errored campaign experiment",
    clientMethod: "deleteExperiment",
    schema: ExperimentIdParamsSchema,
    destructive: true,
  }),
];
