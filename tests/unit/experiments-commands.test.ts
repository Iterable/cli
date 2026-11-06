import type { IterableClient } from "@iterable/api";
import { describe, expect, it, jest } from "@jest/globals";

import { experimentCommands } from "../../src/commands/experiments.js";

const cases = [
  {
    name: "get-totals",
    clientMethod: "getExperimentTotals",
    params: { experimentId: 1 },
  },
  {
    name: "get-trends",
    clientMethod: "getExperimentTrends",
    params: {
      experimentId: 1,
      startDateTime: "2026-01-01T00:00:00Z",
      endDateTime: "2026-01-02T00:00:00Z",
    },
  },
  {
    name: "create",
    clientMethod: "createExperiment",
    params: { campaignId: 1, experimentType: "SubjectLine" },
  },
  {
    name: "copy-variant",
    clientMethod: "copyExperimentVariant",
    params: { experimentId: 1, copyFromTemplateId: 2 },
  },
  {
    name: "update-settings",
    clientMethod: "updateExperimentSettings",
    params: { experimentId: 1, evenlySplitVariations: true },
  },
  {
    name: "start",
    clientMethod: "startExperiment",
    params: { experimentId: 1 },
  },
  {
    name: "cancel",
    clientMethod: "cancelExperiment",
    params: { experimentId: 1 },
  },
  {
    name: "declare-winner",
    clientMethod: "declareExperimentWinner",
    params: { experimentId: 1, variantId: 2 },
  },
  {
    name: "delete",
    clientMethod: "deleteExperiment",
    params: { experimentId: 1 },
  },
] as const;

function getCommand(name: string) {
  const command = experimentCommands.find(
    (candidate) => candidate.name === name
  );
  if (!command) {
    throw new Error(`Command not found: ${name}`);
  }
  return command;
}

describe("experiment lifecycle commands", () => {
  it.each(cases)(
    "$name validates input and dispatches to $clientMethod",
    async ({ name, clientMethod, params }) => {
      const command = getCommand(name);
      const parsed = command.schema.parse(params) as Record<string, unknown>;
      const method = jest
        .fn<(params: Record<string, unknown>) => Promise<unknown>>()
        .mockResolvedValue({});
      const client = { [clientMethod]: method } as unknown as IterableClient;

      expect(command.schema.safeParse({}).success).toBe(false);
      await command.execute(client, parsed);
      expect(method).toHaveBeenCalledWith(parsed);
    }
  );

  it("marks delete as destructive", () => {
    const command = experimentCommands.find(
      (candidate) => candidate.name === "delete"
    );
    expect(command?.destructive).toBe(true);
  });
});
