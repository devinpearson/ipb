import chalk from "chalk";
import { printTitleBox } from "../index.js";
interface Options {
  email: string;
  password: string;
  credentialsFile: string;
}

export async function registerCommand(options: Options) {
  try {
    printTitleBox();
    if (!options.email || !options.password) {
      throw new Error("Email and password are required");
    }
    console.log("💳 registering account");
    const result = await fetch("https://ipb.sandboxpay.co.za/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: options.email,
        password: options.password,
      }),
    });
    if (!result.ok) {
      const body = await result.text();
      throw new Error(`Error: ${result.status} ${body}`);
    }

    console.log("Account registered successfully");
    console.log("");
  } catch (error: any) {
    console.error(chalk.redBright("Failed to register:"), error.message);
    console.log("");
  }
}
