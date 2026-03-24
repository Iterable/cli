import {
  CreateSnippetParamsSchema,
  DeleteSnippetParamsSchema,
  GetSnippetParamsSchema,
  UpdateSnippetParamsSchema,
} from "@iterable/api";
import { z } from "zod";

import type { CommandDefinition } from "./types.js";
import { defineCommand } from "./types.js";

export const snippetCommands: CommandDefinition[] = [
  defineCommand({
    category: "snippets",
    name: "list",
    description: "Get all snippets for the current project",
    clientMethod: "getSnippets",
    schema: z.object({}),
    execute: (client) => client.getSnippets(),
  }),
  defineCommand({
    category: "snippets",
    name: "get",
    description: "Get a snippet by ID (numeric) or name (string)",
    clientMethod: "getSnippet",
    schema: GetSnippetParamsSchema,
  }),
  defineCommand({
    category: "snippets",
    name: "create",
    description: "Create a new snippet with Handlebars templating support",
    clientMethod: "createSnippet",
    schema: CreateSnippetParamsSchema,
  }),
  defineCommand({
    category: "snippets",
    name: "update",
    description: "Update a snippet by ID (numeric) or name (string)",
    clientMethod: "updateSnippet",
    schema: UpdateSnippetParamsSchema,
  }),
  defineCommand({
    category: "snippets",
    name: "delete",
    description: "Delete a snippet by ID (numeric) or name (string)",
    clientMethod: "deleteSnippet",
    schema: DeleteSnippetParamsSchema,
  }),
];
