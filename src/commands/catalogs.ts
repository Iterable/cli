import {
  BulkDeleteCatalogItemsParamsSchema,
  CreateCatalogParamsSchema,
  DeleteCatalogItemParamsSchema,
  DeleteCatalogParamsSchema,
  GetCatalogFieldMappingsParamsSchema,
  GetCatalogItemParamsSchema,
  GetCatalogItemsParamsSchema,
  GetCatalogsParamsSchema,
  PartialUpdateCatalogItemParamsSchema,
  ReplaceCatalogItemParamsSchema,
  UpdateCatalogFieldMappingsParamsSchema,
  UpdateCatalogItemParamsSchema,
} from "@iterable/api";

import type { CommandDefinition } from "./types.js";
import { defineCommand } from "./types.js";

export const catalogCommands: CommandDefinition[] = [
  defineCommand({
    category: "catalogs",
    name: "list",
    description: "Get list of all catalogs with optional pagination",
    clientMethod: "getCatalogs",
    schema: GetCatalogsParamsSchema,
  }),
  defineCommand({
    category: "catalogs",
    name: "get-items",
    description:
      "Get items from a catalog with optional pagination and sorting",
    clientMethod: "getCatalogItems",
    schema: GetCatalogItemsParamsSchema,
  }),
  defineCommand({
    category: "catalogs",
    name: "get-item",
    description: "Get a specific catalog item by ID",
    clientMethod: "getCatalogItem",
    schema: GetCatalogItemParamsSchema,
  }),
  defineCommand({
    category: "catalogs",
    name: "create",
    description: "Create a new catalog",
    clientMethod: "createCatalog",
    schema: CreateCatalogParamsSchema,
  }),
  defineCommand({
    category: "catalogs",
    name: "delete",
    description: "Delete a catalog",
    clientMethod: "deleteCatalog",
    schema: DeleteCatalogParamsSchema,
  }),
  defineCommand({
    category: "catalogs",
    name: "get-field-mappings",
    description: "Get field mappings and data types for a catalog",
    clientMethod: "getCatalogFieldMappings",
    schema: GetCatalogFieldMappingsParamsSchema,
  }),
  defineCommand({
    category: "catalogs",
    name: "update-field-mappings",
    description: "Update catalog field mappings (data types)",
    clientMethod: "updateCatalogFieldMappings",
    schema: UpdateCatalogFieldMappingsParamsSchema,
  }),
  defineCommand({
    category: "catalogs",
    name: "update-items",
    description: "Update catalog items",
    clientMethod: "updateCatalogItems",
    schema: UpdateCatalogItemParamsSchema,
  }),
  defineCommand({
    category: "catalogs",
    name: "delete-item",
    description: "Delete a specific catalog item by ID",
    clientMethod: "deleteCatalogItem",
    schema: DeleteCatalogItemParamsSchema,
  }),
  defineCommand({
    category: "catalogs",
    name: "bulk-delete-items",
    description: "Bulk delete catalog items by their IDs",
    clientMethod: "bulkDeleteCatalogItems",
    schema: BulkDeleteCatalogItemsParamsSchema,
  }),
  defineCommand({
    category: "catalogs",
    name: "partial-update-item",
    description:
      "Partial update (PATCH) a catalog item - updates only specified fields",
    clientMethod: "partialUpdateCatalogItem",
    schema: PartialUpdateCatalogItemParamsSchema,
  }),
  defineCommand({
    category: "catalogs",
    name: "replace-item",
    description:
      "Replace (PUT) a catalog item - replaces the entire item with new value",
    clientMethod: "replaceCatalogItem",
    schema: ReplaceCatalogItemParamsSchema,
  }),
];
