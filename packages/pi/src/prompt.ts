import * as readline from "node:readline";

/**
 * Prompt user for input via readline
 */
export async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt user for userId with validation
 */
export async function promptForUserId(): Promise<string> {
  console.log("\n=== User ID Setup ===");
  console.log(
    "Please enter your User ID from the Grid app (found in your profile):",
  );

  let userId = "";
  let attempts = 0;
  const maxAttempts = 3;

  while (!userId && attempts < maxAttempts) {
    const input = await prompt("\nUser ID: ");

    if (!input) {
      attempts++;
      console.log(
        `\n⚠ User ID cannot be empty. (${maxAttempts - attempts} attempts remaining)`,
      );
      continue;
    }

    // Basic validation: should be a non-empty string
    // You can add more specific validation based on your userId format
    if (input.length < 3) {
      attempts++;
      console.log(
        `\n⚠ User ID seems too short. Please check and try again. (${maxAttempts - attempts} attempts remaining)`,
      );
      continue;
    }

    userId = input;
  }

  if (!userId) {
    throw new Error(
      "Failed to get valid User ID after multiple attempts. Please try again.",
    );
  }

  return userId;
}

/**
 * Ask user if they want to update their userId
 */
export async function confirmUserIdUpdate(
  currentUserId: string,
): Promise<boolean> {
  console.log(`\nCurrent User ID: ${currentUserId}`);
  const answer = await prompt("Do you want to update it? (yes/no): ");
  return answer.toLowerCase() === "yes" || answer.toLowerCase() === "y";
}
