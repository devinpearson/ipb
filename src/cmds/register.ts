import { printTitleBox } from "../index.js";
import fetch from "node-fetch";
import https from "https";
import { handleCliError } from "../utils.js";
import { input, password } from "@inquirer/prompts";

const agent = new https.Agent({
  rejectUnauthorized: process.env.REJECT_UNAUTHORIZED !== "false",
});
interface Options {
  email: string;
  password: string;
  credentialsFile: string;
}

export async function registerCommand(options: any) {
  try {
    printTitleBox();
    // Prompt for email and password if not provided
    if (!options.email) {
      options.email = await input({
        message: "Enter your email:",
        validate: (input: string) =>
          input.includes("@") || "Please enter a valid email.",
      });
    }
    if (!options.password) {
      options.password = await password({
        message: "Enter your password:",
        mask: "*",
        validate: (input: string) =>
          input.length >= 6 || "Password must be at least 6 characters.",
      });
    }
    if (!options.email || !options.password) {
      throw new Error("Email and password are required");
    }
    console.log("💳 registering account");
    const result = await fetch("https://ipb.sandboxpay.co.za/auth/register", {
      agent,
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
  } catch (error: any) {
    handleCliError(error, { verbose: options.verbose }, "register");
  }
}
