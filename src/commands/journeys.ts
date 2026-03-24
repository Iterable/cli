import {
  GetJourneysParamsSchema,
  TriggerJourneyParamsSchema,
} from "@iterable/api";

import { sortTransform } from "./transforms.js";
import type { CommandDefinition } from "./types.js";
import { defineCommand } from "./types.js";

export const journeyCommands: CommandDefinition[] = [
  defineCommand({
    category: "journeys",
    name: "list",
    description:
      "Get journeys (workflows) with optional pagination and state filtering",
    clientMethod: "getJourneys",
    schema: GetJourneysParamsSchema,
    cliTransforms: { sort: sortTransform },
  }),
  defineCommand({
    category: "journeys",
    name: "trigger",
    description: "Trigger a journey (workflow) for a user",
    clientMethod: "triggerJourney",
    schema: TriggerJourneyParamsSchema,
  }),
];
