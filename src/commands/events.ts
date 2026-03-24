import {
  GetUserEventsByEmailParamsSchema,
  GetUserEventsByUserIdParamsSchema,
  TrackBulkEventsParamsSchema,
  TrackEventParamsSchema,
} from "@iterable/api";

import type { CommandDefinition } from "./types.js";
import { defineCommand } from "./types.js";

export const eventCommands: CommandDefinition[] = [
  defineCommand({
    category: "events",
    name: "track",
    description: "Track a custom event for a user",
    clientMethod: "trackEvent",
    schema: TrackEventParamsSchema,
  }),
  defineCommand({
    category: "events",
    name: "track-bulk",
    description:
      "Track multiple events in a single request for better performance",
    clientMethod: "trackBulkEvents",
    schema: TrackBulkEventsParamsSchema,
  }),
  defineCommand({
    category: "events",
    name: "get-by-email",
    description: "Get event history for a user by email address",
    clientMethod: "getUserEventsByEmail",
    schema: GetUserEventsByEmailParamsSchema,
  }),
  defineCommand({
    category: "events",
    name: "get-by-userid",
    description: "Get event history for a user by user ID",
    clientMethod: "getUserEventsByUserId",
    schema: GetUserEventsByUserIdParamsSchema,
  }),
];
