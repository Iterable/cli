import {
  BulkUpdateUsersParamsSchema,
  DeleteUserByEmailParamsSchema,
  DeleteUserByUserIdParamsSchema,
  GetSentMessagesParamsSchema,
  GetUserByEmailParamsSchema,
  GetUserByIdParamsSchema,
  UpdateEmailParamsSchema,
  UpdateUserParamsSchema,
  UpdateUserSubscriptionsParamsSchema,
} from "@iterable/api";
import { z } from "zod";

import type { CommandDefinition } from "./types.js";
import { defineAlias, defineCommand } from "./types.js";

export const userCommands: CommandDefinition[] = [
  defineAlias({
    category: "users",
    name: "get",
    description: "Get a user by email or userId (auto-detected)",
    schema: z.object({
      identifier: z.string().describe("Email address or userId"),
    }),
    execute: (client, params) =>
      params.identifier.includes("@")
        ? client.getUserByEmail({ email: params.identifier })
        : client.getUserByUserId({ userId: params.identifier }),
  }),
  defineCommand({
    category: "users",
    name: "get-by-email",
    description: "Get user profile information by email address",
    clientMethod: "getUserByEmail",
    schema: GetUserByEmailParamsSchema,
  }),
  defineCommand({
    category: "users",
    name: "get-by-userid",
    description: "Get user profile information by user ID",
    clientMethod: "getUserByUserId",
    schema: GetUserByIdParamsSchema,
  }),
  defineCommand({
    category: "users",
    name: "update",
    description: "Update user profile information (accepts email OR userId)",
    clientMethod: "updateUser",
    schema: UpdateUserParamsSchema,
  }),
  defineAlias({
    category: "users",
    name: "delete",
    description: "Delete a user by email or userId (auto-detected)",
    schema: z.object({
      identifier: z.string().describe("Email address or userId"),
    }),
    execute: (client, params) =>
      params.identifier.includes("@")
        ? client.deleteUserByEmail({ email: params.identifier })
        : client.deleteUserByUserId({ userId: params.identifier }),
    destructive: true,
  }),
  defineCommand({
    category: "users",
    name: "delete-by-email",
    description: "Delete a user by email address (asynchronous)",
    clientMethod: "deleteUserByEmail",
    schema: DeleteUserByEmailParamsSchema,
    destructive: true,
  }),
  defineCommand({
    category: "users",
    name: "delete-by-userid",
    description:
      "Delete a user by user ID (asynchronous, deletes all users with same userId)",
    clientMethod: "deleteUserByUserId",
    schema: DeleteUserByUserIdParamsSchema,
    destructive: true,
  }),
  defineCommand({
    category: "users",
    name: "update-email",
    description:
      "Update a user's email address (only for email-based projects)",
    clientMethod: "updateEmail",
    schema: UpdateEmailParamsSchema,
  }),
  defineCommand({
    category: "users",
    name: "update-subscriptions",
    description:
      "Update user subscriptions (overwrites existing data for any non-null fields specified)",
    clientMethod: "updateUserSubscriptions",
    schema: UpdateUserSubscriptionsParamsSchema,
  }),
  defineCommand({
    category: "users",
    name: "bulk-update",
    description: "Update multiple users at once",
    clientMethod: "bulkUpdateUsers",
    schema: BulkUpdateUsersParamsSchema,
  }),
  defineCommand({
    category: "users",
    name: "get-sent-messages",
    description: "Get messages sent to a specific user with optional filtering",
    clientMethod: "getSentMessages",
    schema: GetSentMessagesParamsSchema,
  }),
  defineCommand({
    category: "users",
    name: "get-fields",
    description: "Get all user profile field definitions and their types",
    clientMethod: "getUserFields",
    schema: z.object({}),
    execute: (client) => client.getUserFields(),
  }),
];
