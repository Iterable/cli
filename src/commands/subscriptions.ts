import {
  BulkUpdateSubscriptionsParamsSchema,
  SubscribeUserByEmailParamsSchema,
  SubscribeUserByUserIdParamsSchema,
  UnsubscribeUserByEmailParamsSchema,
  UnsubscribeUserByUserIdParamsSchema,
} from "@iterable/api";

import type { CommandDefinition } from "./types.js";
import { defineCommand } from "./types.js";

export const subscriptionCommands: CommandDefinition[] = [
  defineCommand({
    category: "subscriptions",
    name: "bulk-update",
    description:
      "Subscribe or unsubscribe multiple users to/from a subscription group",
    clientMethod: "bulkUpdateSubscriptions",
    schema: BulkUpdateSubscriptionsParamsSchema,
  }),
  defineCommand({
    category: "subscriptions",
    name: "subscribe-by-email",
    description: "Subscribe a user to a subscription group by email",
    clientMethod: "subscribeUserByEmail",
    schema: SubscribeUserByEmailParamsSchema,
  }),
  defineCommand({
    category: "subscriptions",
    name: "subscribe-by-userid",
    description: "Subscribe a user to a subscription group by userId",
    clientMethod: "subscribeUserByUserId",
    schema: SubscribeUserByUserIdParamsSchema,
  }),
  defineCommand({
    category: "subscriptions",
    name: "unsubscribe-by-email",
    description: "Unsubscribe a user from a subscription group by email",
    clientMethod: "unsubscribeUserByEmail",
    schema: UnsubscribeUserByEmailParamsSchema,
  }),
  defineCommand({
    category: "subscriptions",
    name: "unsubscribe-by-userid",
    description: "Unsubscribe a user from a subscription group by userId",
    clientMethod: "unsubscribeUserByUserId",
    schema: UnsubscribeUserByUserIdParamsSchema,
  }),
];
