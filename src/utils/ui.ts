/* eslint-disable no-console */
import boxen from "boxen";
import chalk from "chalk";
import Table from "cli-table3";

import { detectBackground } from "./detect-background.js";

const THEME = {
  primary: "#5F40D8",
  accent: "#16C5FF",
  success: "#5DB5A1",
  error: "#E64F7C",
  info: "#16C5FF",
  neutralDark: "#111827",
  neutralLighter: "#CBD5E1",
  purpleBright: "#C4B5FD",
} as const;

function isDarkBackground(): boolean {
  return detectBackground() === "dark";
}

function linkHex(): string {
  return isDarkBackground() ? THEME.accent : "#0EA5E9";
}

export function linkColor(): (s: string) => string {
  return chalk.hex(linkHex());
}

function successHex(): string {
  return isDarkBackground() ? THEME.success : "#166534";
}

export const icons = {
  key: "🔑",
  bulb: "💡",
  fire: "🔥",
} as const;

export function showSuccess(message: string): void {
  console.log(chalk.hex(successHex())("✔ " + message));
}

export function showError(message: string): void {
  console.log(chalk.hex(THEME.error)("✖ " + message));
}

export function showInfo(message: string): void {
  console.log(chalk.hex(THEME.info)("  " + message));
}

export function showBox(
  title: string,
  content: string | string[],
  options: {
    icon?: string;
    theme?: "primary" | "success" | "warning" | "error" | "info";
    padding?: number;
  } = {}
): void {
  const { icon, theme: boxTheme = "primary", padding = 1 } = options;
  const displayTitle = icon ? `${icon}  ${title}` : title;
  const message = Array.isArray(content) ? content.join("\n") : content;

  const borderColorMap: Record<string, string> = {
    primary: "magenta",
    success: "green",
    warning: "yellow",
    error: "red",
    info: "cyan",
  };

  console.log(
    boxen(message, {
      title: displayTitle,
      titleAlignment: "center",
      padding,
      margin: { top: 1, bottom: 1 },
      borderStyle: "round",
      borderColor: borderColorMap[boxTheme] ?? "magenta",
    })
  );
}

export function showSection(title: string, icon?: string): void {
  console.log();
  const showIcons = process.env.ITERABLE_UI_ICONS === "true";
  const displayTitle = icon && showIcons ? `${icon}  ${title}` : title;
  const dark = isDarkBackground();
  console.log(
    chalk.bold.hex(dark ? THEME.purpleBright : THEME.primary)(displayTitle)
  );
  console.log(
    chalk.hex(dark ? THEME.neutralLighter : THEME.neutralDark)(
      "─".repeat(Math.min(displayTitle.length + 2, 60))
    )
  );
}

export function createTable(options: {
  head: string[];
  colWidths?: (number | null)[];
  style?: "compact" | "normal" | "spacious";
}): Table.Table {
  const { head, colWidths, style = "normal" } = options;
  const padding =
    style === "compact"
      ? { left: 1, right: 1 }
      : style === "spacious"
        ? { left: 2, right: 2 }
        : { left: 1, right: 1 };

  const dark = isDarkBackground();
  const headColorHex = dark ? THEME.accent : THEME.primary;
  return new Table({
    head: head.map((h) => chalk.bold.hex(headColorHex)(h)),
    ...(colWidths && { colWidths }),
    style: {
      head: [],
      border: ["magenta"],
      "padding-left": padding.left,
      "padding-right": padding.right,
    },
    chars: {
      top: "─",
      "top-mid": "┬",
      "top-left": "╭",
      "top-right": "╮",
      bottom: "─",
      "bottom-mid": "┴",
      "bottom-left": "╰",
      "bottom-right": "╯",
      left: "│",
      "left-mid": "├",
      mid: "─",
      "mid-mid": "┼",
      right: "│",
      "right-mid": "┤",
      middle: "│",
    },
  });
}
