import omelette from "omelette";

import {
  findCommand,
  getCategories,
  getCommandsByCategory,
} from "./commands/registry.js";
import { OUTPUT_FORMATS } from "./output.js";
import { describeCommand } from "./parser.js";
import { FLAG_DEFS } from "./router.js";
import { COMMAND_NAME, KEYS_SUBCOMMANDS } from "./utils/command-info.js";

export const COMPLETION_SUBCOMMANDS = ["install", "uninstall"] as const;

const SPECIAL_CATEGORIES: Record<string, readonly string[]> = {
  keys: KEYS_SUBCOMMANDS,
  completion: COMPLETION_SUBCOMMANDS,
};

const topLevelCompletions = [
  ...getCategories(),
  ...Object.keys(SPECIAL_CATEGORIES),
];

const globalFlagCompletions = FLAG_DEFS.flatMap((d) => d.aliases);

const completion = omelette(COMMAND_NAME);

completion.on("complete", (_fragment, { before, reply, line }) => {
  const parts = line.trim().split(" ").slice(1);
  // Trailing space means the current word is complete — user wants next arg
  const depth = line.endsWith(" ") ? parts.length + 1 : parts.length;
  const [category, action] = parts;

  if (depth <= 1) {
    reply([...topLevelCompletions, "--help", "--version"]);
    return;
  }

  if (depth === 2) {
    const special = category ? SPECIAL_CATEGORIES[category] : undefined;
    if (special) {
      reply([...special]);
      return;
    }
    if (category) {
      reply([...getCommandsByCategory(category).map((c) => c.name), "--help"]);
      return;
    }
  }

  if (category && action) {
    if (before === "--output") {
      reply([...OUTPUT_FORMATS]);
      return;
    }

    if (before === "--key") {
      import("./key-manager.js")
        .then(({ getKeyManager }) => getKeyManager().listKeys())
        .then((keys) => reply(keys.map((k) => k.name)))
        .catch(() => reply([]));
      return;
    }

    const cmd = findCommand(category, action);
    if (cmd) {
      const cmdFlags = describeCommand(cmd).map((f) => `--${f.name}`);
      reply([...cmdFlags, ...globalFlagCompletions]);
      return;
    }
  }

  reply([]);
});

export { completion };
