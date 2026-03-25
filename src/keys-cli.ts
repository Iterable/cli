/* eslint-disable no-console */
import { IterableClient } from "@iterable/api";
import chalk from "chalk";
import inquirer from "inquirer";

import { loadCliConfig } from "./config.js";
import type { ApiKeyMetadata, KeyManager } from "./key-manager.js";
import { getKeyManager } from "./key-manager.js";
import { getSpinner, isTestEnv } from "./utils/cli-env.js";
import { COMMAND_NAME, KEYS_COMMAND_TABLE } from "./utils/command-info.js";
import { promptForIterableBaseUrl } from "./utils/endpoint-prompt.js";
import { getKeyStorageMessage } from "./utils/formatting.js";
import { promptForApiKey } from "./utils/password-prompt.js";
import { sanitizeString } from "./utils/sanitize.js";
import {
  createTable,
  icons,
  linkColor,
  showBox,
  showError,
  showInfo,
  showSection,
  showSuccess,
} from "./utils/ui.js";

function displayKeyDetails(meta: ApiKeyMetadata): void {
  const w = 12;
  console.log(`  ${"Name:".padEnd(w)} ${chalk.white.bold(meta.name)}`);
  console.log(`  ${"ID:".padEnd(w)} ${chalk.gray(meta.id)}`);
  console.log(`  ${"Endpoint:".padEnd(w)} ${linkColor()(meta.baseUrl)}`);
}

async function findKeyOrExit(
  keyManager: KeyManager,
  idOrName: string | undefined,
  commandName: string
): Promise<ApiKeyMetadata> {
  if (!idOrName) {
    showError("Missing key name or ID");
    console.log(`  Usage: ${COMMAND_NAME} keys ${commandName} <name-or-id>`);
    showInfo("If your key name has spaces, wrap it in quotes");
    process.exit(1);
  }

  const keys = await keyManager.listKeys();
  const key = keys.find(
    (k: ApiKeyMetadata) => k.id === idOrName || k.name === idOrName
  );

  if (!key) {
    showError(`Key not found: ${idOrName}`);
    showInfo(`Run '${COMMAND_NAME} keys list' to view all keys`);
    process.exit(1);
  }

  return key;
}

async function saveKeyInteractive(
  keyManager: KeyManager,
  existingKeyArg: ApiKeyMetadata | null
): Promise<string> {
  const spinner = await getSpinner();

  let isUpdate = existingKeyArg !== null;
  let existingKey = existingKeyArg;

  const maybeActivateKey = async (
    key: ApiKeyMetadata
  ): Promise<ApiKeyMetadata> => {
    if (key.isActive) {
      showSuccess(`"${key.name}" is already your active key`);
      return key;
    }

    const { activateNow } = await inquirer.prompt<{ activateNow: boolean }>([
      {
        type: "confirm",
        name: "activateNow",
        message: `Set "${key.name}" as your active API key now?`,
        default: !isUpdate,
      },
    ]);

    if (activateNow) {
      await keyManager.setActiveKey(key.id);
      showSuccess(`"${key.name}" is now your active API key`);
      const updatedKey = await keyManager.getKeyMetadata(key.id);
      return updatedKey ?? key;
    }

    showInfo(
      `Keeping your current active key. Run '${COMMAND_NAME} keys activate "${key.name}"' to switch later.`
    );
    return key;
  };

  // Step 1: Get API key value
  let apiKey: string;
  if (isUpdate && existingKey) {
    const { updateApiKey } = await inquirer.prompt([
      {
        type: "confirm",
        name: "updateApiKey",
        message: "Update the API key value?",
        default: false,
      },
    ]);

    if (updateApiKey) {
      apiKey = await promptForApiKey("Enter your new Iterable API key:");
    } else {
      spinner.start("Retrieving existing API key...");
      try {
        const existing = await keyManager.getKey(existingKey.id);
        if (!existing) {
          spinner.fail("Failed to retrieve existing API key");
          showError("Could not access the existing API key value");
          showInfo("You'll need to enter a new API key value");
          apiKey = await promptForApiKey("Enter your Iterable API key:");
        } else {
          spinner.succeed("Using existing API key");
          apiKey = existing;
        }
      } catch (error: unknown) {
        spinner.fail("Failed to retrieve existing API key");
        showError(
          error instanceof Error ? error.message : "Could not access key"
        );
        showInfo("You'll need to enter a new API key value");
        apiKey = await promptForApiKey("Enter your Iterable API key:");
      }
    }
  } else {
    apiKey = await promptForApiKey("Enter your Iterable API key:");
  }

  // Step 2: Check for duplicate keys (new keys only)
  if (!isUpdate) {
    const existingKeyWithValue = await keyManager.findKeyByValue(apiKey);

    if (existingKeyWithValue) {
      showInfo(
        `This API key is already stored as "${existingKeyWithValue.name}"`
      );

      displayKeyDetails(existingKeyWithValue);
      console.log();

      const { updateExisting } = await inquirer.prompt([
        {
          type: "confirm",
          name: "updateExisting",
          message: "Update this key with new settings?",
          default: true,
        },
      ]);

      if (!updateExisting) {
        await maybeActivateKey(existingKeyWithValue);
        return existingKeyWithValue.id;
      }

      isUpdate = true;
      existingKey = existingKeyWithValue;
    }
  }

  // Step 3: Prompt for endpoint
  let baseUrl: string;
  try {
    baseUrl = await promptForIterableBaseUrl(
      existingKey?.baseUrl ? { defaultBaseUrl: existingKey.baseUrl } : undefined
    );
  } catch {
    process.exit(1);
  }

  if (isUpdate && existingKey && existingKey.baseUrl !== baseUrl) {
    showInfo(`Endpoint changing from ${existingKey.baseUrl} to ${baseUrl}`);
  }

  // Step 4: Prompt for name
  const validateKeyName = async (input: string): Promise<string | true> => {
    if (!input) return "Name is required";
    if (input.length > 50) return "Name must be 50 characters or less";
    if (input !== existingKey?.name) {
      const keys = await keyManager.listKeys();
      if (keys.some((k) => k.name === input)) {
        return `A key named "${input}" already exists. Please choose a different name.`;
      }
    }
    return true;
  };

  const { name } = await inquirer.prompt<{ name: string }>([
    {
      type: "input",
      name: "name",
      message: isUpdate
        ? "Enter a new name, or press Enter to keep current name:"
        : "Enter a name for this API key:",
      default: existingKey?.name ?? "default",
      validate: validateKeyName,
    },
  ]);

  // Step 5: Save the key
  spinner.start(
    isUpdate ? "Updating API key..." : "Storing API key securely..."
  );
  try {
    const id =
      isUpdate && existingKey
        ? await keyManager.updateKey(existingKey.id, name, apiKey, baseUrl)
        : await keyManager.addKey(name, apiKey, baseUrl);

    spinner.succeed(
      isUpdate
        ? "API key updated successfully!"
        : "API key stored successfully!"
    );

    const w = 12;
    console.log();
    console.log(`  ${"Name:".padEnd(w)} ${chalk.white.bold(name)}`);
    console.log(`  ${"ID:".padEnd(w)} ${chalk.gray(id)}`);
    console.log(`  ${"Endpoint:".padEnd(w)} ${linkColor()(baseUrl)}`);
    console.log();
    showSuccess(
      isUpdate
        ? "Your API key has been updated (encrypted at rest)"
        : "Your API key is now securely stored (encrypted at rest)"
    );

    const savedKey = await keyManager.getKeyMetadata(id);
    if (savedKey) {
      await maybeActivateKey(savedKey);
    } else {
      showError("Failed to get key metadata after saving");
      process.exit(1);
    }

    return id;
  } catch (error: unknown) {
    spinner.fail(
      isUpdate ? "Failed to update API key" : "Failed to add API key"
    );
    const msg =
      error instanceof Error ? sanitizeString(error.message) : "Unknown error";
    showError(msg);
    process.exit(1);
  }
}

/** Handle `iterable keys <subcommand>` */
export async function handleKeysCommand(args: string[]): Promise<void> {
  const subCommand = args[0];
  const positionalArgs = args.filter((arg) => !arg.startsWith("--"));

  const spinner = await getSpinner();
  const keyManager = getKeyManager();

  try {
    await keyManager.initialize();
  } catch (error: unknown) {
    showError(
      `Failed to initialize key manager: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    if (isTestEnv()) return;
    process.exit(1);
  }

  switch (subCommand) {
    case "list": {
      const keys = await keyManager.listKeys();

      if (keys.length === 0) {
        showBox(
          "No API Keys Found",
          [
            chalk.gray("You haven't added any API keys yet."),
            "",
            chalk.cyan("Get started by running:"),
            chalk.bold.white(`  ${COMMAND_NAME} keys add`),
          ],
          { icon: icons.key, theme: "info" }
        );
      } else {
        showSection("Stored API Keys", icons.key);
        console.log();

        const table = createTable({
          head: ["Name", "ID", "Endpoint", "Modified", "Status"],
          style: "normal",
        });

        for (const key of keys) {
          const statusBadge = key.isActive
            ? chalk.bgGreen.black(" ACTIVE ")
            : chalk.gray("INACTIVE");

          const dateToShow = key.updated ?? key.created;
          const formattedDate = new Date(dateToShow).toLocaleDateString(
            "en-US",
            { year: "numeric", month: "short", day: "numeric" }
          );

          const endpoint = key.baseUrl.replace("https://", "");

          table.push([
            chalk.white.bold(key.name),
            chalk.gray(key.id),
            linkColor()(endpoint),
            chalk.gray(formattedDate),
            statusBadge,
          ]);
        }

        console.log(table.toString());
        console.log();

        showBox(
          "Key Management",
          [
            ...KEYS_COMMAND_TABLE.map(
              ([cmd, desc]) => `${chalk.cyan(cmd)} - ${chalk.gray(desc)}`
            ),
            "",
            getKeyStorageMessage(),
          ],
          { icon: icons.key, theme: "info", padding: 1 }
        );
      }
      break;
    }

    case "add": {
      await saveKeyInteractive(keyManager, null);
      break;
    }

    case "update": {
      const existingKey = await findKeyOrExit(
        keyManager,
        positionalArgs[1],
        "update"
      );
      await saveKeyInteractive(keyManager, existingKey);
      break;
    }

    case "activate": {
      const keyToActivate = await findKeyOrExit(
        keyManager,
        positionalArgs[1],
        "activate"
      );

      spinner.start(`Activating key "${keyToActivate.name}"...`);

      try {
        await keyManager.getKey(keyToActivate.id);
      } catch (error: unknown) {
        spinner.fail("Failed to activate key");
        showError(
          error instanceof Error ? error.message : "Failed to access key"
        );
        showInfo(
          `This key's value is not accessible. Update it with: ${COMMAND_NAME} keys update "${keyToActivate.name}"`
        );
        process.exit(1);
      }

      await keyManager.setActiveKey(keyToActivate.id);
      spinner.stop();

      const meta = await keyManager.getActiveKeyMetadata();
      if (meta) {
        showSuccess(`Switched to "${meta.name}"`);
        console.log();
        displayKeyDetails(meta);
        console.log();
      } else {
        showSuccess(`"${keyToActivate.name}" is now your active API key`);
      }
      break;
    }

    case "deactivate": {
      if (!(await keyManager.hasActiveKey())) {
        showInfo("No key is currently active.");
        break;
      }
      const activeMeta = await keyManager.getActiveKeyMetadata();
      await keyManager.deactivateAllKeys();
      showSuccess(
        `Deactivated "${activeMeta?.name ?? "active key"}". Commands will require ITERABLE_API_KEY env var until a key is activated.`
      );
      break;
    }

    case "delete": {
      const keyToDelete = await findKeyOrExit(
        keyManager,
        positionalArgs[1],
        "delete"
      );

      const allKeys = await keyManager.listKeys();
      const otherKeys = allKeys.filter((k) => k.id !== keyToDelete.id);

      if (keyToDelete.isActive && otherKeys.length === 0) {
        showInfo("This is your active key and the only key stored.");
      } else if (keyToDelete.isActive) {
        showInfo("This is your active key.");
      }

      let confirmDelete: boolean;
      if (isTestEnv()) {
        confirmDelete = true;
      } else {
        ({ confirmDelete } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmDelete",
            message: `Permanently delete key "${keyToDelete.name}"?`,
            default: false,
          },
        ]));
      }

      if (!confirmDelete) {
        showInfo("Deletion cancelled.");
        return;
      }

      if (keyToDelete.isActive && otherKeys.length > 0) {
        const { newActiveKey } = await inquirer.prompt<{
          newActiveKey: string;
        }>([
          {
            type: "list" as const,
            name: "newActiveKey",
            message: "Select a new active key:",
            choices: [
              ...otherKeys.map((k) => ({
                name: `${k.name} (${k.baseUrl})`,
                value: k.id,
              })),
              { name: "Don't activate any key", value: "none" },
            ],
          },
        ]);
        if (newActiveKey !== "none") {
          await keyManager.setActiveKey(newActiveKey);
          const activated = otherKeys.find((k) => k.id === newActiveKey);
          if (activated) {
            showSuccess(`Switched to "${activated.name}"`);
          }
        }
      }

      try {
        await keyManager.deleteKey(keyToDelete.id);
        showSuccess("Key securely removed");
      } catch (error: unknown) {
        showError(error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
      }
      break;
    }

    case "validate": {
      spinner.start("Validating API connection...");
      try {
        const config = await loadCliConfig();
        const debug =
          process.env.ITERABLE_DEBUG === "true" ||
          process.env.ITERABLE_DEBUG_VERBOSE === "true";
        const client = new IterableClient({
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          debug,
          debugVerbose: process.env.ITERABLE_DEBUG_VERBOSE === "true",
        });
        try {
          await client.getUserFields();
          spinner.succeed("API connection successful");
          const w = 12;
          if (process.env.ITERABLE_API_KEY) {
            console.log(
              `  ${"Source:".padEnd(w)} ${chalk.white("ITERABLE_API_KEY environment variable")}`
            );
          } else {
            const activeMeta = await keyManager.getActiveKeyMetadata();
            if (activeMeta) {
              console.log(
                `  ${"Key:".padEnd(w)} ${chalk.white.bold(activeMeta.name)}`
              );
            }
          }
          const endpoint = config.baseUrl.replace("https://", "");
          console.log(`  ${"Endpoint:".padEnd(w)} ${linkColor()(endpoint)}`);
        } finally {
          client.destroy();
        }
      } catch (error: unknown) {
        spinner.fail("API connection failed");
        if (process.env.ITERABLE_API_KEY) {
          showInfo("Source: ITERABLE_API_KEY environment variable");
        } else {
          const activeMeta = await keyManager
            .getActiveKeyMetadata()
            .catch(() => null);
          if (activeMeta) {
            showInfo(`Key: ${activeMeta.name}`);
          }
        }
        showError(error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
      }
      break;
    }

    default: {
      showSection("Available Commands", icons.key);
      console.log();

      const commandsTable = createTable({
        head: ["Command", "Description"],
        colWidths: [45, 40],
        style: "normal",
      });

      commandsTable.push(
        ...KEYS_COMMAND_TABLE.map(([cmd, desc]) => [cmd, chalk.gray(desc)])
      );

      console.log(commandsTable.toString());
      console.log();

      showSection("Examples", icons.fire);
      console.log();
      console.log(chalk.white.bold("  Add API keys"));
      console.log(chalk.gray("  (Interactive prompts: name, region, API key)"));
      console.log();
      console.log(chalk.cyan(`    ${COMMAND_NAME} keys add`));
      console.log();
      console.log(chalk.white.bold("  Manage your keys"));
      console.log();
      console.log(chalk.cyan(`    ${COMMAND_NAME} keys list`));
      console.log(chalk.cyan(`    ${COMMAND_NAME} keys add`));
      console.log(chalk.cyan(`    ${COMMAND_NAME} keys update production`));
      console.log(chalk.cyan(`    ${COMMAND_NAME} keys activate production`));
      console.log(
        chalk.cyan(
          `    ${COMMAND_NAME} keys delete 3f5d2b07-5b1c-4e86-8f3c-9a1b2c3d4e5f`
        )
      );
      console.log();

      showBox(
        "Important Notes",
        [
          "API keys are prompted interactively - never stored in shell history",
          "Each API key is tightly coupled to its endpoint (US/EU/custom)",
          getKeyStorageMessage(),
          "The active key (● ACTIVE) is what your CLI commands will use",
        ],
        { icon: icons.bulb, theme: "info", padding: 1 }
      );
      break;
    }
  }
}
