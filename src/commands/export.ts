import {
  CancelExportJobParamsSchema,
  GetExportFilesParamsSchema,
  GetExportJobsParamsSchema,
  StartExportJobParamsSchema,
} from "@iterable/api";

import type { CommandDefinition } from "./types.js";
import { defineCommand } from "./types.js";

export const exportCommands: CommandDefinition[] = [
  defineCommand({
    category: "export",
    name: "list-jobs",
    description: "Get a list of recent export jobs for the current project",
    clientMethod: "getExportJobs",
    schema: GetExportJobsParamsSchema,
  }),
  defineCommand({
    category: "export",
    name: "get-files",
    description:
      "Get the job status and download URLs for files from a completed export job",
    clientMethod: "getExportFiles",
    schema: GetExportFilesParamsSchema,
  }),
  defineCommand({
    category: "export",
    name: "start",
    description:
      "Start a data export job that processes as a background job. Use get-files to check status and obtain download links.",
    clientMethod: "startExportJob",
    schema: StartExportJobParamsSchema,
  }),
  defineCommand({
    category: "export",
    name: "cancel",
    description: "Cancel a queued or running export job",
    clientMethod: "cancelExportJob",
    schema: CancelExportJobParamsSchema,
  }),
];
