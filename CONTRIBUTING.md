# Contributing to Iterable CLI

## Development Setup

```bash
git clone https://github.com/Iterable/cli.git
cd cli
pnpm install
pnpm build
```

## Architecture

The CLI is a thin layer over the `[@iterable/api](https://github.com/Iterable/api-client)` client. Each command maps a Zod schema from the client package to CLI arguments and calls one client method.

### Request flow

```
argv
 → router.ts        parse global flags (--output, --help, --version), extract category + action
 → registry.ts      look up the CommandDefinition by category + action
 → parser.ts        bridge the command's Zod schema to CLI args via zod-opts
 → command.execute   call the IterableClient method with parsed params
 → output.ts        format the result as JSON, colorized JSON, or a table
```

### How the parser works

The parser in `src/parser.ts` introspects each command's Zod schema to build CLI flags automatically:

- **Scalar types** (string, number, boolean, enum) are registered directly with zod-opts
- **Complex types** (objects, arrays, records) fall back to JSON string flags — the user passes `--field '{"key":"value"}'` or uses `--json` for the whole payload
- **CLI transforms** let you expose complex schema fields as multiple simple flags (e.g., the `sort` object becomes `--sort <field> --order <direction>`)
- **Positional arguments** are auto-detected: if a command has exactly one required scalar field, it can be passed without a flag name (e.g., `iterable campaigns get 123`)

This means most commands need zero custom parsing code — just a schema and a client method name.

## Adding a New Command

CLI commands wrap methods from `@iterable/api`. If the API endpoint you need isn't in the client yet, add it there first (with its Zod schema).

1. Add a `defineCommand` call to the appropriate category file in `src/commands/`:

```typescript
defineCommand({
  category: "campaigns",
  name: "get",
  description: "Get detailed information about a specific campaign",
  clientMethod: "getCampaign",
  schema: GetCampaignParamsSchema,
})
```

The default `execute` passes the parsed params object directly to the client method: `client[clientMethod](params)`. All client methods accept their corresponding Params schema object, so a custom `execute` is only needed for aliases that route to different methods based on input (see `users.ts` for examples).

2. Run `pnpm build` — this verifies types and regenerates `COMMANDS.md` from the command registry. Never edit `COMMANDS.md` by hand.
3. Add the new command to the expected list in `tests/unit/commands.test.ts`. This test ensures every `IterableClient` method has a corresponding CLI command and catches accidental additions or removals.

## Testing

```bash
pnpm test:unit         # Parser, router, commands registry, key manager — no network
pnpm test:integration  # Calls the real Iterable API (needs ITERABLE_API_KEY)
pnpm test:e2e          # Spawns the CLI binary as a subprocess
pnpm test              # All of the above (runs build first)
```

Integration and E2E tests that need an API key are skipped automatically when `ITERABLE_API_KEY` is not set.

## Before Committing

Run `pnpm check` to catch formatting, type, and lint issues.