import {
  CancelEmailParamsSchema,
  CancelInAppParamsSchema,
  CancelPushParamsSchema,
  CancelSMSParamsSchema,
  CancelWebPushParamsSchema,
  CancelWhatsAppParamsSchema,
  GetEmbeddedMessagesParamsSchema,
  GetInAppMessagesParamsSchema,
  SendEmailParamsSchema,
  SendInAppParamsSchema,
  SendPushParamsSchema,
  SendSMSParamsSchema,
  SendWebPushParamsSchema,
  SendWhatsAppParamsSchema,
} from "@iterable/api";
import { z } from "zod";

import type { CommandDefinition } from "./types.js";
import { defineCommand } from "./types.js";

export const messagingCommands: CommandDefinition[] = [
  defineCommand({
    category: "messaging",
    name: "send-email",
    description: "Send email to user",
    clientMethod: "sendEmail",
    schema: SendEmailParamsSchema,
  }),
  defineCommand({
    category: "messaging",
    name: "cancel-email",
    description: "Cancel scheduled email for specific user",
    clientMethod: "cancelEmail",
    schema: CancelEmailParamsSchema,
  }),
  defineCommand({
    category: "messaging",
    name: "send-sms",
    description: "Send SMS message to user",
    clientMethod: "sendSMS",
    schema: SendSMSParamsSchema,
  }),
  defineCommand({
    category: "messaging",
    name: "cancel-sms",
    description: "Cancel scheduled SMS message for specific user",
    clientMethod: "cancelSMS",
    schema: CancelSMSParamsSchema,
  }),
  defineCommand({
    category: "messaging",
    name: "send-push",
    description: "Send push notification to user",
    clientMethod: "sendPush",
    schema: SendPushParamsSchema,
  }),
  defineCommand({
    category: "messaging",
    name: "cancel-push",
    description: "Cancel scheduled push notification for specific user",
    clientMethod: "cancelPush",
    schema: CancelPushParamsSchema,
  }),
  defineCommand({
    category: "messaging",
    name: "send-web-push",
    description: "Send web push notification to user",
    clientMethod: "sendWebPush",
    schema: SendWebPushParamsSchema,
  }),
  defineCommand({
    category: "messaging",
    name: "cancel-web-push",
    description: "Cancel scheduled web push notification for specific user",
    clientMethod: "cancelWebPush",
    schema: CancelWebPushParamsSchema,
  }),
  defineCommand({
    category: "messaging",
    name: "send-whatsapp",
    description: "Send WhatsApp message to user",
    clientMethod: "sendWhatsApp",
    schema: SendWhatsAppParamsSchema,
  }),
  defineCommand({
    category: "messaging",
    name: "cancel-whatsapp",
    description: "Cancel scheduled WhatsApp message for specific user",
    clientMethod: "cancelWhatsApp",
    schema: CancelWhatsAppParamsSchema,
  }),
  defineCommand({
    category: "messaging",
    name: "send-in-app",
    description: "Send in-app message to user",
    clientMethod: "sendInApp",
    schema: SendInAppParamsSchema,
  }),
  defineCommand({
    category: "messaging",
    name: "cancel-in-app",
    description: "Cancel scheduled in-app message for specific user",
    clientMethod: "cancelInApp",
    schema: CancelInAppParamsSchema,
  }),
  defineCommand({
    category: "messaging",
    name: "get-in-app-messages",
    description: "Get in-app messages for a user",
    clientMethod: "getInAppMessages",
    schema: GetInAppMessagesParamsSchema,
  }),
  defineCommand({
    category: "messaging",
    name: "get-embedded-messages",
    description: "Get embedded messages for a user, grouped by placement ID",
    clientMethod: "getEmbeddedMessages",
    schema: GetEmbeddedMessagesParamsSchema,
  }),
  defineCommand({
    category: "messaging",
    name: "get-channels",
    description:
      "Get all available communication channels (email, SMS, push, etc.)",
    clientMethod: "getChannels",
    schema: z.object({}),
    execute: (client) => client.getChannels(),
  }),
  defineCommand({
    category: "messaging",
    name: "get-message-types",
    description:
      "Get all message types within the project for use in templates",
    clientMethod: "getMessageTypes",
    schema: z.object({}),
    execute: (client) => client.getMessageTypes(),
  }),
];
