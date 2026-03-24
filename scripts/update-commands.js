import { readFileSync, writeFileSync } from "fs";
import { COMMANDS_BY_CATEGORY } from "../dist/commands/registry.js";
import { describeCommand } from "../dist/parser.js";
import { COMMAND_NAME, KEYS_COMMAND_TABLE } from "../dist/utils/command-info.js";

const COMMANDS_FILE = "COMMANDS.md";

function generatePlaceholder(field) {
  if (field.type === "json") return "<json>";
  if (field.type.endsWith("[]")) return `<${field.name}...>`;
  return `<${field.name}>`;
}

function formatType(field) {
  if (field.enumValues) {
    return field.enumValues.map((v) => `\`${v}\``).join(" \\| ");
  }
  return field.type;
}

function renderCommand(cmd, category) {
  const lines = [];
  const alias = cmd.isAlias ? " *(alias)*" : "";
  lines.push(`### ${category} ${cmd.name}${alias}`);
  lines.push("");
  lines.push(cmd.description);
  lines.push("");

  const fields = describeCommand(cmd);

  // Examples: hand-written or auto-generated with placeholders
  if (cmd.examples && cmd.examples.length > 0) {
    lines.push("```");
    for (const ex of cmd.examples) {
      lines.push(ex);
    }
    lines.push("```");
    lines.push("");
  } else {
    const requiredFields = fields.filter((f) => f.required);
    const placeholders = requiredFields.map((f) => ({
      field: f,
      placeholder: generatePlaceholder(f),
    }));
    const hasAllPlaceholders = placeholders.every((p) => p.placeholder !== null);

    if (requiredFields.length > 0 && hasAllPlaceholders) {
      const parts = [`${COMMAND_NAME} ${category} ${cmd.name}`];
      for (const { field, placeholder } of placeholders) {
        if (field.isPositional) {
          parts.push(placeholder);
        } else {
          parts.push(`--${field.name} ${placeholder}`);
        }
      }
      lines.push("```");
      lines.push(parts.join(" "));
      lines.push("```");
      lines.push("");
    }
  }

  // Parameter table
  if (fields.length > 0) {
    lines.push("| Option | Type | Required | Description |");
    lines.push("|--------|------|----------|-------------|");
    for (const f of fields) {
      const name = f.isPositional ? `\`${f.name}\`` : `\`--${f.name}\``;
      const type = formatType(f);
      const req = f.required ? "**yes**" : "no";
      let desc = f.description;
      if (f.defaultValue !== undefined) {
        desc += ` (default: ${JSON.stringify(f.defaultValue)})`;
      }
      lines.push(`| ${name} | ${type} | ${req} | ${desc} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

try {
  const commandsByCategory = COMMANDS_BY_CATEGORY.map(
    ({ category, commands }) => ({
      category,
      commands: [...commands].sort((a, b) => a.name.localeCompare(b.name)),
    })
  );
  const totalCount = commandsByCategory.reduce(
    (acc, { commands }) => acc + commands.length,
    0
  );

  const sections = [
    `# Available Commands (${totalCount} commands)`,
    "",
    `All commands follow the pattern: \`${COMMAND_NAME} <category> <command> [options]\``,
    "",
    "Every command also accepts `--json <data>` for raw JSON input and `--help` for usage details.",
  ];

  for (const { category, commands } of commandsByCategory) {
    sections.push("");
    sections.push(`## ${category} (${commands.length} commands)`);
    sections.push("");
    for (const cmd of commands) {
      try {
        sections.push(renderCommand(cmd, category));
      } catch {
        const a = cmd.isAlias ? " *(alias)*" : "";
        sections.push(
          `### ${category} ${cmd.name}${a}\n\n${cmd.description}\n`
        );
      }
    }
  }

  sections.push("");
  sections.push("## keys");
  sections.push("");
  sections.push("Manage stored API keys.");
  sections.push("");
  for (const [cmd, desc] of KEYS_COMMAND_TABLE) {
    sections.push(`### ${cmd.split(" ").slice(1).join(" ")}`);
    sections.push("");
    sections.push(desc);
    sections.push("");
    sections.push("```");
    sections.push(cmd);
    sections.push("```");
    sections.push("");
  }

  const newContent = sections.join("\n") + "\n";

  const existingContent = (() => {
    try {
      return readFileSync(COMMANDS_FILE, "utf8");
    } catch {
      return "";
    }
  })();

  if (newContent !== existingContent) {
    writeFileSync(COMMANDS_FILE, newContent);
    console.log(`Generated ${COMMANDS_FILE} with ${totalCount} commands`);
  }
} catch (error) {
  console.error(
    `Error generating ${COMMANDS_FILE}:`,
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
}
