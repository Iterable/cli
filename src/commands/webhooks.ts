import { UpdateWebhookParamsSchema } from "@iterable/api";
import { z } from "zod";

import type { CommandDefinition } from "./types.js";
import { defineCommand } from "./types.js";

export const webhookCommands: CommandDefinition[] = [
  defineCommand({
    category: "webhooks",
    name: "list",
    description: "Get all webhooks for the project",
    clientMethod: "getWebhooks",
    schema: z.object({}),
    execute: (client) => client.getWebhooks(),
  }),
  defineCommand({
    category: "webhooks",
    name: "update",
    description: "Update a webhook configuration",
    clientMethod: "updateWebhook",
    schema: UpdateWebhookParamsSchema,
  }),
];
