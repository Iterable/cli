import { campaignCommands } from "./campaigns.js";
import { catalogCommands } from "./catalogs.js";
import { eventCommands } from "./events.js";
import { experimentCommands } from "./experiments.js";
import { exportCommands } from "./export.js";
import { journeyCommands } from "./journeys.js";
import { listCommands } from "./lists.js";
import { messagingCommands } from "./messaging.js";
import { snippetCommands } from "./snippets.js";
import { subscriptionCommands } from "./subscriptions.js";
import { templateCommands } from "./templates.js";
import type { CommandDefinition } from "./types.js";
import { userCommands } from "./users.js";
import { webhookCommands } from "./webhooks.js";

export const COMMANDS_BY_CATEGORY = [
  { category: "campaigns", commands: campaignCommands },
  { category: "catalogs", commands: catalogCommands },
  { category: "events", commands: eventCommands },
  { category: "experiments", commands: experimentCommands },
  { category: "export", commands: exportCommands },
  { category: "journeys", commands: journeyCommands },
  { category: "lists", commands: listCommands },
  { category: "messaging", commands: messagingCommands },
  { category: "snippets", commands: snippetCommands },
  { category: "subscriptions", commands: subscriptionCommands },
  { category: "templates", commands: templateCommands },
  { category: "users", commands: userCommands },
  { category: "webhooks", commands: webhookCommands },
] as const;

export function getAllCommands(): CommandDefinition[] {
  return COMMANDS_BY_CATEGORY.flatMap(({ commands }) => commands);
}

export function getCategories(): string[] {
  return COMMANDS_BY_CATEGORY.map(({ category }) => category);
}

export function getCommandsByCategory(category: string): CommandDefinition[] {
  const entry = COMMANDS_BY_CATEGORY.find((c) => c.category === category);
  return entry ? [...entry.commands] : [];
}

export function findCommand(
  category: string,
  name: string
): CommandDefinition | undefined {
  return getCommandsByCategory(category).find((cmd) => cmd.name === name);
}
