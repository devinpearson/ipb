import { credentialLocation, printTitleBox } from "../index.js";
import fs from "fs";
import fetch from "node-fetch";
import https from "https";
import { handleCliError } from "../utils.js";
import { input, password } from "@inquirer/prompts";
import { CliError, ERROR_CODES } from "../errors.js";

const agent = new https.Agent({
  rejectUnauthorized: process.env.REJECT_UNAUTHORIZED !== "false",
});

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

export async function loginCommand(options: any) {
  try {
    printTitleBox();
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
      throw new CliError(ERROR_CODES.INVALID_CREDENTIALS, "Email and password are required");
    }
    console.log("💳 logging into account");
    const result = await fetch("https://ipb.sandboxpay.co.za/auth/login", {
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
    if (fs.existsSync(credentialLocation.filename)) {
      cred = JSON.parse(fs.readFileSync(credentialLocation.filename, "utf8"));
    } else {
      if (!fs.existsSync(credentialLocation.folder)) {
        fs.mkdirSync(credentialLocation.folder, { recursive: true });
      }

      await fs.writeFileSync(credentialLocation.filename, JSON.stringify(cred));
    }
    cred = JSON.parse(fs.readFileSync(credentialLocation.filename, "utf8"));
    cred.sandboxKey = loginResponse.access_token;
    await fs.writeFileSync(credentialLocation.filename, JSON.stringify(cred));
    console.log("🔑 access token saved");
  } catch (error: any) {
    handleCliError(error, options, "login");
  }
}
