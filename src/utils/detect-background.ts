export type BackgroundMode = "dark" | "light";

export function detectBackground(): BackgroundMode {
  const override = (process.env.ITERABLE_UI_THEME ?? "").toLowerCase();
  if (override === "dark") return "dark";
  if (override === "light") return "light";
  if (process.env.NO_COLOR) return "light";

  const cfg = process.env.COLORFGBG;
  if (cfg) {
    const parts = cfg.split(";");
    const bg = parseInt(parts[parts.length - 1] ?? "", 10);
    if (!Number.isNaN(bg)) return bg <= 7 ? "dark" : "light";
  }

  const term = (process.env.TERM_PROGRAM ?? "").toLowerCase();
  if (term === "apple_terminal") return "light";
  if (
    [
      "iterm.app",
      "wezterm",
      "ghostty",
      "vscode",
      "hyper",
      "alacritty",
      "kitty",
    ].includes(term)
  )
    return "dark";
  if (process.env.TERM?.includes("256color")) return "dark";

  return "light";
}
