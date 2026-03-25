# Iterable CLI

[![npm version](https://img.shields.io/npm/v/@iterable/cli.svg)](https://www.npmjs.com/package/@iterable/cli)

> **Note:** This is an open-source developer tool, not an officially supported Iterable product. It is provided "as is" under the MIT License with no warranty or support guarantees.

A command-line interface for the [Iterable API](https://api.iterable.com/api/docs). Manage campaigns, templates, users, lists, and more from your terminal.

## Installation

**Prerequisites:**
- Node.js >= 20 (v22 LTS recommended)
- An Iterable API key

Install from npm:

```bash
npm install -g @iterable/cli
```

Or run directly with npx:

```bash
npx @iterable/cli campaigns list
```

## Quick Start

Add your API key (stored securely in your system keychain):

```bash
iterable keys add
```

Then start using the CLI:

```bash
iterable campaigns list
```

For CI/scripting environments, you can also use an environment variable:

```bash
export ITERABLE_API_KEY=your_api_key_here
```

## Usage

```bash
iterable <category> <command> [options]
```

### Examples

```bash
# List campaigns
iterable campaigns list

# Get a specific campaign
iterable campaigns get 123

# List campaigns sorted by creation date
iterable campaigns list --sort createdAt --order desc

# Get a user (auto-detects email vs userId)
iterable users get user@example.com
iterable users get some-user-id

# Create a list
iterable lists create --name "My List"

# Pass complex parameters as JSON
iterable campaigns create-blast --json '{"name":"My Campaign","templateId":123,"listIds":[1,2,3]}'

# Pipe JSON from stdin
echo '{"page":1,"pageSize":5}' | iterable campaigns list --json -

# Output as a table
iterable campaigns list --output table

# Output as colorized JSON
iterable campaigns list --output pretty
```

### Positional Arguments

Commands that take a single identifier support positional arguments:

```bash
iterable campaigns get 123            # equivalent to --id 123
iterable campaigns abort 456          # equivalent to --campaignId 456
iterable users get-by-email user@example.com  # equivalent to --email user@example.com
iterable snippets get my-snippet      # equivalent to --identifier my-snippet
```

### Smart Aliases

Some categories have convenience aliases that auto-detect the identifier type:

```bash
iterable users get user@example.com   # routes to get-by-email
iterable users get some-user-id       # routes to get-by-userid
iterable users delete user@example.com  # routes to delete-by-email
```

## Available Commands

See the [full command reference](COMMANDS.md) for all 109 commands with parameter details.

**Categories:** campaigns, catalogs, events, experiments, export, journeys, lists, messaging, snippets, subscriptions, templates, users, webhooks

## Global Options

| Option | Description |
|--------|-------------|
| `--help, -h` | Show help |
| `--version, -V` | Show version |
| `--output <format>` | Output format: `json`, `pretty`, `table` |
| `--columns <cols>` | Comma-separated columns for table output |
| `--json <data>` | Pass raw JSON (use `-` for stdin) |
| `--file <path>` | Read JSON input from a file |
| `--key, -k <name>` | Use a specific stored key (overrides env var and active key) |
| `--force, -f` | Skip confirmation prompts for destructive commands |

## Output Formats

- **`json`** (default when piped): Raw JSON
- **`pretty`** (default in terminal): Colorized JSON with syntax highlighting
- **`table`**: Tabular format with auto-detected data shape

### Table output

Table mode auto-detects the data shape:
- List responses (e.g., `{campaigns: [...]}`) render as a table with one row per item
- Single objects render as a key-value table

Use `--columns` to select which columns to display:

```bash
iterable campaigns list --output table --columns id,name,campaignState
```

Without `--columns`, all fields are shown.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ITERABLE_API_KEY` | API key (overrides key manager; `--key` flag takes precedence) | — |
| `ITERABLE_BASE_URL` | API base URL (used with env var key only) | `https://api.iterable.com` |
| `ITERABLE_DEBUG` | Enable debug logging (HTTP requests/responses to stderr) | `false` |
| `ITERABLE_DEBUG_VERBOSE` | Include response bodies in debug output (may contain PII) | `false` |

### Key Management

The CLI supports storing multiple API keys securely:

```bash
iterable keys add                   # Add a new key interactively
iterable keys list                  # List stored keys
iterable keys activate <name>       # Switch active key
iterable keys deactivate            # Deactivate current key
iterable keys update <name>         # Update an existing key
iterable keys delete <name>         # Remove a key
iterable keys validate              # Test the API connection
```

Keys are stored securely using:
- **macOS**: Keychain
- **Windows**: DPAPI encryption
- **Linux**: File with restrictive permissions (`~/.iterable/keys.json`)

## Development

```bash
git clone https://github.com/Iterable/cli.git
cd cli
pnpm install
pnpm build
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Lint, compile, generate docs |
| `pnpm check` | Typecheck and lint (no changes) |
| `pnpm test` | Run all tests |
| `pnpm test:unit` | Run unit tests |
| `pnpm test:integration` | Run integration tests |
| `pnpm test:e2e` | Run E2E tests |
| `pnpm dev` | Run with hot reload |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

[MIT](LICENSE.md)
