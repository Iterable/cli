import chalk from "chalk";

import { detectBackground } from "./detect-background.js";

const mode = detectBackground();

export const theme = {
  key: mode === "dark" ? chalk.hex("#7DD3FC") : chalk.hex("#0369A1"),
  value: mode === "dark" ? chalk.hex("#86EFAC") : chalk.green,
  number: mode === "dark" ? chalk.hex("#FDE68A") : chalk.yellow,
  boolean: mode === "dark" ? chalk.hex("#67E8F9") : chalk.cyan,
  muted: mode === "dark" ? chalk.hex("#E5E7EB") : chalk.dim,
  accent: mode === "dark" ? chalk.hex("#7DD3FC") : chalk.cyan,
  bold: chalk.bold,
} as const;
