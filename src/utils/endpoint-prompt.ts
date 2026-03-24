import chalk from "chalk";
import inquirer from "inquirer";

import { isHttpsOrLocalhost, isLocalhostHost } from "./url.js";

const US_ENDPOINT = "https://api.iterable.com";
const EU_ENDPOINT = "https://api.eu.iterable.com";

/** Prompt user to select Iterable region or provide a custom endpoint. */
export async function promptForIterableBaseUrl(options?: {
  defaultBaseUrl?: string;
}): Promise<string> {
  const defaultBaseUrl = options?.defaultBaseUrl;
  const allowFlagEmoji = process.platform !== "win32";

  let defaultChoice = "us";
  if (defaultBaseUrl) {
    if (defaultBaseUrl === US_ENDPOINT) defaultChoice = "us";
    else if (defaultBaseUrl === EU_ENDPOINT) defaultChoice = "eu";
    else defaultChoice = "custom";
  }

  const { endpointChoice } = await inquirer.prompt<{
    endpointChoice: string;
  }>([
    {
      type: "list" as const,
      name: "endpointChoice",
      message: "Select your Iterable region:",
      choices: [
        {
          name: `${allowFlagEmoji ? "🇺🇸  " : ""}US (api.iterable.com)`,
          value: "us",
          short: "US",
        },
        {
          name: `${allowFlagEmoji ? "🇪🇺  " : ""}EU (api.eu.iterable.com)`,
          value: "eu",
          short: "EU",
        },
        {
          name: `${allowFlagEmoji ? "🌍  " : ""}Custom endpoint`,
          value: "custom",
          short: "Custom",
        },
      ],
      default: defaultChoice,
    },
  ]);

  if (endpointChoice === "us") return US_ENDPOINT;
  if (endpointChoice === "eu") return EU_ENDPOINT;

  const customUrlQuestion = {
    type: "input" as const,
    name: "customUrl" as const,
    message: "Enter custom API endpoint URL:",
    validate: (input: string) => {
      if (!input) return "URL is required";
      try {
        new URL(input);
        return true;
      } catch {
        return "Invalid URL format";
      }
    },
    ...(defaultChoice === "custom" && defaultBaseUrl
      ? { default: defaultBaseUrl }
      : {}),
  };
  const { customUrl } = await inquirer.prompt<{ customUrl: string }>([
    customUrlQuestion,
  ]);

  const url = new URL(customUrl);
  const isIterableDomain =
    url.hostname === "iterable.com" || url.hostname.endsWith(".iterable.com");
  const isLocalhost = isLocalhostHost(url.hostname);

  if (!isHttpsOrLocalhost(url)) {
    console.error(
      // eslint-disable-line no-console
      chalk.red(
        "HTTP is not allowed for non-local endpoints. Please use HTTPS."
      )
    );
    throw new Error("insecure-nonlocal");
  }

  if (!isIterableDomain && !isLocalhost) {
    console.log(); // eslint-disable-line no-console
    console.log(
      // eslint-disable-line no-console
      chalk.yellow(
        "You selected a non-Iterable domain. This reduces security assurances and may not be supported."
      )
    );
    const { confirmCustom } = await inquirer.prompt<{
      confirmCustom: boolean;
    }>([
      {
        type: "confirm" as const,
        name: "confirmCustom",
        message: `Proceed with endpoint ${customUrl}?`,
        default: false,
      },
    ]);
    if (!confirmCustom) {
      throw new Error("custom-cancelled");
    }
  }

  return customUrl;
}
