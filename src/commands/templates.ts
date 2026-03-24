import {
  BulkDeleteTemplatesParamsSchema,
  GetTemplateByClientIdParamsSchema,
  GetTemplateParamsSchema,
  GetTemplatesParamsSchema,
  PreviewTemplateParamsSchema,
  SendTemplateProofParamsSchema,
  UpdateEmailTemplateParamsSchema,
  UpdateInAppTemplateParamsSchema,
  UpdatePushTemplateParamsSchema,
  UpdateSMSTemplateParamsSchema,
  UpsertEmailTemplateParamsSchema,
  UpsertInAppTemplateParamsSchema,
  UpsertPushTemplateParamsSchema,
  UpsertSMSTemplateParamsSchema,
} from "@iterable/api";

import { sortTransform } from "./transforms.js";
import type { CommandDefinition } from "./types.js";
import { defineCommand } from "./types.js";

export const templateCommands: CommandDefinition[] = [
  defineCommand({
    category: "templates",
    name: "list",
    description: "Retrieve templates",
    clientMethod: "getTemplates",
    schema: GetTemplatesParamsSchema,
    cliTransforms: { sort: sortTransform },
  }),
  defineCommand({
    category: "templates",
    name: "get-by-client-id",
    description: "Get template by client template ID",
    clientMethod: "getTemplateByClientId",
    schema: GetTemplateByClientIdParamsSchema,
  }),
  defineCommand({
    category: "templates",
    name: "delete",
    description: "Delete one or more templates by ID",
    clientMethod: "deleteTemplates",
    schema: BulkDeleteTemplatesParamsSchema,
  }),

  // Email templates
  defineCommand({
    category: "templates",
    name: "get-email",
    description: "Get details for specific email template by ID",
    clientMethod: "getEmailTemplate",
    schema: GetTemplateParamsSchema,
  }),
  defineCommand({
    category: "templates",
    name: "update-email",
    description: "Update existing email template by templateId",
    clientMethod: "updateEmailTemplate",
    schema: UpdateEmailTemplateParamsSchema,
  }),
  defineCommand({
    category: "templates",
    name: "upsert-email",
    description:
      "Create or update email template. If a template with the specified clientTemplateId exists, it will be updated; otherwise, a new template will be created.",
    clientMethod: "upsertEmailTemplate",
    schema: UpsertEmailTemplateParamsSchema,
  }),
  defineCommand({
    category: "templates",
    name: "preview-email",
    description:
      "Preview email template with custom data. Returns fully rendered HTML.",
    clientMethod: "previewEmailTemplate",
    schema: PreviewTemplateParamsSchema,
  }),
  defineCommand({
    category: "templates",
    name: "proof-email",
    description: "Send a proof of an email template to a specific user",
    clientMethod: "sendEmailTemplateProof",
    schema: SendTemplateProofParamsSchema,
  }),

  // SMS templates
  defineCommand({
    category: "templates",
    name: "get-sms",
    description: "Get details for specific SMS template by ID",
    clientMethod: "getSMSTemplate",
    schema: GetTemplateParamsSchema,
  }),
  defineCommand({
    category: "templates",
    name: "update-sms",
    description: "Update existing SMS template by templateId",
    clientMethod: "updateSMSTemplate",
    schema: UpdateSMSTemplateParamsSchema,
  }),
  defineCommand({
    category: "templates",
    name: "upsert-sms",
    description:
      "Create or update SMS template. If a template with the specified clientTemplateId exists, it will be updated; otherwise, a new template will be created.",
    clientMethod: "upsertSMSTemplate",
    schema: UpsertSMSTemplateParamsSchema,
  }),
  defineCommand({
    category: "templates",
    name: "proof-sms",
    description: "Send a proof of an SMS template to a specific user",
    clientMethod: "sendSMSTemplateProof",
    schema: SendTemplateProofParamsSchema,
  }),

  // Push templates
  defineCommand({
    category: "templates",
    name: "get-push",
    description: "Get details for specific push notification template by ID",
    clientMethod: "getPushTemplate",
    schema: GetTemplateParamsSchema,
  }),
  defineCommand({
    category: "templates",
    name: "update-push",
    description: "Update existing push notification template by templateId",
    clientMethod: "updatePushTemplate",
    schema: UpdatePushTemplateParamsSchema,
  }),
  defineCommand({
    category: "templates",
    name: "upsert-push",
    description:
      "Create or update push notification template. If a template with the specified clientTemplateId exists, it will be updated; otherwise, a new template will be created.",
    clientMethod: "upsertPushTemplate",
    schema: UpsertPushTemplateParamsSchema,
  }),
  defineCommand({
    category: "templates",
    name: "proof-push",
    description:
      "Send a proof of a push notification template to a specific user",
    clientMethod: "sendPushTemplateProof",
    schema: SendTemplateProofParamsSchema,
  }),

  // In-app templates
  defineCommand({
    category: "templates",
    name: "get-inapp",
    description: "Get details for specific in-app message template by ID",
    clientMethod: "getInAppTemplate",
    schema: GetTemplateParamsSchema,
  }),
  defineCommand({
    category: "templates",
    name: "update-inapp",
    description: "Update existing in-app message template by templateId",
    clientMethod: "updateInAppTemplate",
    schema: UpdateInAppTemplateParamsSchema,
  }),
  defineCommand({
    category: "templates",
    name: "upsert-inapp",
    description:
      "Create or update in-app message template. If a template with the specified clientTemplateId exists, it will be updated; otherwise, a new template will be created.",
    clientMethod: "upsertInAppTemplate",
    schema: UpsertInAppTemplateParamsSchema,
  }),
  defineCommand({
    category: "templates",
    name: "preview-inapp",
    description:
      "Preview in-app message template with custom data. Returns fully rendered HTML.",
    clientMethod: "previewInAppTemplate",
    schema: PreviewTemplateParamsSchema,
  }),
  defineCommand({
    category: "templates",
    name: "proof-inapp",
    description:
      "Send a proof of an in-app message template to a specific user",
    clientMethod: "sendInAppTemplateProof",
    schema: SendTemplateProofParamsSchema,
  }),
];
