import chalk from "chalk";
import { credentialLocation, printTitleBox } from "../index.js";
import fs from "fs";

interface Options {
  email: string;
  password: string;
  credentialsFile: string;
  verbose: boolean;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  created_at: number;
}

export async function loginCommand(options: Options) {
  try {
    printTitleBox();
    if (!options.email || !options.password) {
      throw new Error("Email and password are required");
    }
    console.log("💳 logging into account");
    const result = await fetch("https://ipb.sandboxpay.co.za/auth/login", {
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
    const loginResponse: LoginResponse = (await result.json()) as LoginResponse;
    console.log("Login successful");
    let cred = {
      clientId: "",
      clientSecret: "",
      apiKey: "",
      cardKey: "",
      openaiKey: "",
      sandboxKey: "",
    };
    cred = JSON.parse(fs.readFileSync(credentialLocation.filename, "utf8"));
    cred.sandboxKey = loginResponse.access_token;
    await fs.writeFileSync(credentialLocation.filename, JSON.stringify(cred));
    console.log("🔑 access token saved");
    console.log("");
  } catch (error: any) {
    console.error(chalk.redBright("Failed to login:"), error.message);
    console.log("");
    if (options.verbose) {
      console.error(error);
    }
  }
}
