import inquirer from "inquirer";

/** Prompt for API key input with masking and validation */
export async function promptForApiKey(promptText: string): Promise<string> {
  const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
    {
      type: "password",
      name: "apiKey",
      message: promptText,
      mask: "*",
      validate: (input: string) => {
        if (!input) return "API key is required";
        if (!/^[a-f0-9]{32}$/.test(input))
          return "API key must be a 32-character lowercase hexadecimal string";
        return true;
      },
    },
  ]);
  return apiKey.trim();
}
