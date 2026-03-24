import type { IterableClient } from "@iterable/api";
import { z } from "zod";

export interface CliTransform {
  cliFields: Record<string, z.ZodType>;
  toParam: (values: Record<string, unknown>) => unknown;
}

export interface CommandDefinition {
  category: string;
  name: string;
  description: string;
  clientMethod?: keyof IterableClient & string;
  schema: z.ZodType;
  execute: (
    client: IterableClient,
    params: Record<string, unknown>
  ) => Promise<unknown>;
  positionalArgs?: string[];
  cliTransforms?: Record<string, CliTransform>;
  examples?: string[];
  isAlias?: boolean;
}

export function defineCommand<
  K extends keyof IterableClient,
  TSchema extends z.ZodType,
>(def: {
  category: string;
  name: string;
  description: string;
  clientMethod: K & string;
  schema: TSchema;
  execute?: (
    client: IterableClient,
    params: z.infer<TSchema>
  ) => Promise<unknown>;
  positionalArgs?: (keyof z.infer<TSchema> & string)[];
  cliTransforms?: Record<string, CliTransform>;
  examples?: string[];
}): CommandDefinition {
  const userExecute = def.execute;
  const execute: CommandDefinition["execute"] = userExecute
    ? (client, params) => userExecute(client, params as z.infer<TSchema>)
    : (client, params) => {
        const method = client[def.clientMethod] as (
          ...args: unknown[]
        ) => Promise<unknown>;
        return method.call(client, params);
      };

  return { ...def, execute };
}

export function defineAlias<TSchema extends z.ZodType>(def: {
  category: string;
  name: string;
  description: string;
  schema: TSchema;
  execute: (
    client: IterableClient,
    params: z.infer<TSchema>
  ) => Promise<unknown>;
  positionalArgs?: (keyof z.infer<TSchema> & string)[];
  cliTransforms?: Record<string, CliTransform>;
  examples?: string[];
}): CommandDefinition {
  const execute: CommandDefinition["execute"] = (client, params) =>
    def.execute(client, params as z.infer<TSchema>);

  return { ...def, execute, isAlias: true };
}
