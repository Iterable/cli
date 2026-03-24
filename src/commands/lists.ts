import {
  CreateListParamsSchema,
  DeleteListParamsSchema,
  GetListPreviewUsersParamsSchema,
  GetListSizeParamsSchema,
  GetListUsersParamsSchema,
  SubscribeToListParamsSchema,
  UnsubscribeFromListParamsSchema,
} from "@iterable/api";
import { z } from "zod";

import type { CommandDefinition } from "./types.js";
import { defineCommand } from "./types.js";

export const listCommands: CommandDefinition[] = [
  defineCommand({
    category: "lists",
    name: "list",
    description: "Retrieve user lists",
    clientMethod: "getLists",
    schema: z.object({}),
    execute: (client) => client.getLists(),
  }),
  defineCommand({
    category: "lists",
    name: "get-users",
    description: "Get users in a specific list",
    clientMethod: "getListUsers",
    schema: GetListUsersParamsSchema,
  }),
  defineCommand({
    category: "lists",
    name: "get-size",
    description: "Get the count of users in a specific list",
    clientMethod: "getListSize",
    schema: GetListSizeParamsSchema,
  }),
  defineCommand({
    category: "lists",
    name: "get-preview-users",
    description: "Preview users in a list (up to 5000 users)",
    clientMethod: "getListPreviewUsers",
    schema: GetListPreviewUsersParamsSchema,
  }),
  defineCommand({
    category: "lists",
    name: "create",
    description: "Create a new user list",
    clientMethod: "createList",
    schema: CreateListParamsSchema,
  }),
  defineCommand({
    category: "lists",
    name: "delete",
    description: "Delete a user list",
    clientMethod: "deleteList",
    schema: DeleteListParamsSchema,
  }),
  defineCommand({
    category: "lists",
    name: "subscribe",
    description: "Subscribe users to a specific list",
    clientMethod: "subscribeUserToList",
    schema: SubscribeToListParamsSchema,
  }),
  defineCommand({
    category: "lists",
    name: "unsubscribe",
    description: "Unsubscribe users from a specific list",
    clientMethod: "unsubscribeUserFromList",
    schema: UnsubscribeFromListParamsSchema,
  }),
];
