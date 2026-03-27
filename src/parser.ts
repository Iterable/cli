import { z } from "zod";
import { parser } from "zod-opts";

import type { CliTransform } from "./commands/types.js";
import { ValidationError } from "./errors.js";

function unwrapSchema(schema: z.ZodType): z.ZodType {
  if (schema instanceof z.ZodOptional)
    return unwrapSchema(schema.unwrap() as z.ZodType);
  if (schema instanceof z.ZodNullable)
    return unwrapSchema(schema.unwrap() as z.ZodType);
  if (schema instanceof z.ZodDefault)
    return unwrapSchema(schema.unwrap() as z.ZodType);
  return schema;
}

function getSchemaShape(schema: z.ZodType): Record<string, z.ZodType> {
  const inner = unwrapSchema(schema);
  if (inner instanceof z.ZodObject) {
    return inner.shape as Record<string, z.ZodType>;
  }
  return {};
}

/**
 * zod-opts supports z.array(z.string()) and z.array(z.number()) but not
 * z.array(z.enum([...])). For those, substitute z.array(z.string()) so
 * the CLI accepts space-separated values. The final schema.parse() in
 * parseCommand validates the enum values.
 */
function coerceForZodOpts(fieldSchema: z.ZodType): z.ZodType {
  const inner = unwrapSchema(fieldSchema);
  if (inner instanceof z.ZodArray) {
    const element = unwrapSchema(inner.element as z.ZodType);
    if (element instanceof z.ZodEnum) {
      const coerced = z.array(z.string());
      if (fieldSchema instanceof z.ZodOptional) return coerced.optional();
      if (fieldSchema instanceof z.ZodDefault) return coerced.default([]);
      return coerced;
    }
  }
  return fieldSchema;
}

function zodOptsProbe(fieldSchema: z.ZodType): boolean {
  try {
    parser()
      .options({ _probe: { type: fieldSchema.optional() } })
      .parse([]);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return !msg.includes("Unsupported zod type");
  }
}

function canZodOptsHandle(fieldSchema: z.ZodType): boolean {
  if (zodOptsProbe(fieldSchema)) return true;
  const coerced = coerceForZodOpts(fieldSchema);
  return coerced !== fieldSchema && zodOptsProbe(coerced);
}

// Only return scalar defaults for display in --help and COMMANDS.md.
// Complex defaults (objects, arrays) are omitted since those fields are
// rendered as JSON fallback inputs where showing a default isn't useful.
function getDefaultValue(
  schema: z.ZodType
): string | number | boolean | undefined {
  if (schema instanceof z.ZodDefault) {
    try {
      const val = schema.parse(undefined);
      if (
        typeof val === "string" ||
        typeof val === "number" ||
        typeof val === "boolean"
      ) {
        return val;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function isOptionalField(schema: z.ZodType): boolean {
  return (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    getDefaultValue(schema) !== undefined
  );
}

function getZodTypeName(schema: z.ZodType): string {
  const inner = unwrapSchema(schema);
  if (inner instanceof z.ZodString) return "string";
  if (inner instanceof z.ZodNumber) return "number";
  if (inner instanceof z.ZodBoolean) return "boolean";
  if (inner instanceof z.ZodEnum) return "enum";
  if (inner instanceof z.ZodArray) {
    return `${getZodTypeName(inner.element as z.ZodType)}[]`;
  }
  if (inner instanceof z.ZodRecord) return "json";
  if (Object.keys(getSchemaShape(schema)).length > 0) return "json";
  return "string";
}

function getEnumValues(schema: z.ZodType): string[] | undefined {
  const inner = unwrapSchema(schema);
  if (inner instanceof z.ZodEnum) return inner.options as string[];
  if (inner instanceof z.ZodArray) {
    const element = unwrapSchema(inner.element as z.ZodType);
    if (element instanceof z.ZodEnum) return element.options as string[];
  }
  return undefined;
}

function getDescription(schema: z.ZodType): string {
  return (schema as { description?: string }).description ?? "";
}

/** Structured description of a command's fields for help text and docs. */
export interface FieldInfo {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: string | number | boolean | undefined;
  isPositional: boolean;
  isJsonFallback: boolean;
  isTransform: boolean;
  enumValues?: string[] | undefined;
  objectKeys?: string[] | undefined;
}

export interface DescribeCommandInput {
  schema: z.ZodType;
  positionalArgs?: string[] | undefined;
  cliTransforms?: Record<string, CliTransform> | undefined;
}

/** Describe all fields of a command — single source of truth for --help and COMMANDS.md. */
export function describeCommand(cmd: DescribeCommandInput): FieldInfo[] {
  const shape = getSchemaShape(cmd.schema);
  const positionalFieldSet = new Set(cmd.positionalArgs ?? []);
  const transformFieldSet = new Set(Object.keys(cmd.cliTransforms ?? {}));
  const fields: FieldInfo[] = [];

  for (const [, transform] of Object.entries(cmd.cliTransforms ?? {})) {
    for (const [cliName, cliType] of Object.entries(transform.cliFields)) {
      fields.push({
        name: cliName,
        type: getZodTypeName(cliType),
        required: !isOptionalField(cliType),
        description: getDescription(cliType),
        defaultValue: getDefaultValue(cliType),
        isPositional: false,
        isJsonFallback: false,
        isTransform: true,
        enumValues: getEnumValues(cliType),
      });
    }
  }

  for (const [key, fieldSchema] of Object.entries(shape)) {
    if (transformFieldSet.has(key)) continue;

    const nativeSupport = canZodOptsHandle(fieldSchema);
    const desc = getDescription(fieldSchema);
    const objectKeys = Object.keys(getSchemaShape(fieldSchema));

    fields.push({
      name: key,
      type: getZodTypeName(fieldSchema),
      required: !isOptionalField(fieldSchema),
      description:
        !nativeSupport && objectKeys.length > 0
          ? `${desc} (JSON: {${objectKeys.join(", ")}})`
          : desc,
      defaultValue: getDefaultValue(fieldSchema),
      isPositional: positionalFieldSet.has(key),
      isJsonFallback: !nativeSupport,
      isTransform: false,
      enumValues: getEnumValues(fieldSchema),
      objectKeys: objectKeys.length > 0 ? objectKeys : undefined,
    });
  }

  // Auto-detect positional: if no explicit positionalArgs and exactly one
  // required non-json non-transform scalar field, mark it as positional
  const hasExplicitPositional = (cmd.positionalArgs ?? []).length > 0;
  if (!hasExplicitPositional) {
    const requiredScalars = fields.filter(
      (f) =>
        f.required && !f.isTransform && !f.isJsonFallback && f.type !== "json"
    );
    if (requiredScalars.length === 1 && requiredScalars[0]) {
      requiredScalars[0].isPositional = true;
    }
  }

  // Sort: required first, then alphabetical
  fields.sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return fields;
}

export interface BuiltParser {
  parse: (argv: string[]) => Record<string, unknown>;
  jsonFallbackFields: string[];
}

/** Build a zod-opts parser from describeCommand metadata. */
export function buildParser(
  schema: z.ZodType,
  commandName: string,
  positionalArgs?: string[],
  cliTransforms?: Record<string, CliTransform>
): BuiltParser {
  const shape = getSchemaShape(schema);

  const fields = describeCommand({ schema, positionalArgs, cliTransforms });

  const options: Record<string, { type: z.ZodType }> = {};
  const jsonFallbackFields: string[] = [];

  for (const field of fields) {
    if (field.isPositional) continue;

    if (field.isTransform) {
      for (const transform of Object.values(cliTransforms ?? {})) {
        if (field.name in transform.cliFields) {
          const cliType = transform.cliFields[field.name];
          if (cliType) options[field.name] = { type: cliType };
          break;
        }
      }
    } else if (field.isJsonFallback) {
      options[field.name] = {
        type: z
          .string()
          .optional()
          .describe(field.description || "JSON value"),
      };
      jsonFallbackFields.push(field.name);
    } else {
      const fieldSchema = shape[field.name];
      if (fieldSchema) {
        options[field.name] = { type: coerceForZodOpts(fieldSchema) };
      }
    }
  }

  let p = parser().name(commandName).options(options);

  const positionalFields = fields.filter((f) => f.isPositional);
  if (positionalFields.length > 0) {
    const args = positionalFields.map((f) => ({
      name: f.name,
      type: shape[f.name] ?? z.string(),
    })) as [
      { name: string; type: z.ZodType },
      ...{ name: string; type: z.ZodType }[],
    ];
    p = p.args(args);
  }

  let parseResult: Record<string, unknown> | undefined;

  p._internalHandler((r) => {
    switch (r.type) {
      case "match":
        parseResult = r.parsed as Record<string, unknown>;
        break;
      case "error":
        throw new ValidationError(r.error.message);
      case "help":
      case "version":
        break;
    }
  });

  return {
    parse: (argv: string[]): Record<string, unknown> => {
      parseResult = undefined;
      p.parse(argv);
      if (!parseResult) throw new ValidationError("Failed to parse arguments");
      return parseResult;
    },
    jsonFallbackFields,
  };
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    console.error(
      // eslint-disable-line no-console
      "Reading JSON from stdin (press Ctrl+D when done, Ctrl+C to cancel)..."
    );
  }
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for stdin input (30s)"));
    }, 30000);
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk: string) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      clearTimeout(timeout);
      resolve(data);
    });
    process.stdin.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export async function parseCommand(
  schema: z.ZodType,
  commandName: string,
  argv: string[],
  positionalArgs?: string[],
  cliTransforms?: Record<string, CliTransform>
): Promise<Record<string, unknown>> {
  const jsonIdx = argv.indexOf("--json");
  if (jsonIdx !== -1) {
    const jsonValue = argv[jsonIdx + 1];
    if (!jsonValue || jsonValue.startsWith("--")) {
      throw new ValidationError(
        "--json requires a value (JSON string or '-' for stdin)"
      );
    }
    const rawInput = jsonValue === "-" ? await readStdin() : jsonValue;
    try {
      return schema.parse(JSON.parse(rawInput)) as Record<string, unknown>;
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new ValidationError(`Invalid JSON: ${e.message}`);
      }
      throw e;
    }
  }

  const built = buildParser(schema, commandName, positionalArgs, cliTransforms);
  const result = built.parse(argv);

  const params: Record<string, unknown> = {};
  const mutableRawParams = { ...result };

  for (const [fieldName, transform] of Object.entries(cliTransforms ?? {})) {
    const values: Record<string, unknown> = {};
    for (const cliName of Object.keys(transform.cliFields)) {
      values[cliName] = mutableRawParams[cliName];
      delete mutableRawParams[cliName]; // eslint-disable-line @typescript-eslint/no-dynamic-delete
    }
    const transformed = transform.toParam(values);
    if (transformed !== undefined) {
      params[fieldName] = transformed;
    }
  }

  for (const [key, value] of Object.entries(mutableRawParams)) {
    if (value === undefined) continue;
    if (built.jsonFallbackFields.includes(key) && typeof value === "string") {
      try {
        params[key] = JSON.parse(value) as unknown;
      } catch (e) {
        throw new ValidationError(
          `Invalid JSON for --${key}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    } else {
      params[key] = value;
    }
  }

  return schema.parse(params) as Record<string, unknown>;
}
