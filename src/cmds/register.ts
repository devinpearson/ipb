import { printTitleBox } from "../index.js";
import fetch from "node-fetch";
import https from "https";
import { handleCliError } from "../utils.js";

const agent = new https.Agent({
  rejectUnauthorized: false,
});
interface Options {
  email: string;
  password: string;
  credentialsFile: string;
}

export async function registerCommand(options: any) {
  try {
    printTitleBox();
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
