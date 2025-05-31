import fs from "fs";
import { credentialLocation } from "@src/index.js";
import { handleCliError } from "@utils";

interface Options {
  clientId: string;
  clientSecret: string;
  apiKey: string;
  cardKey: string;
  openaiKey: string;
  sandboxKey: string;
  verbose: boolean;
}
export async function configCommand(options: Options) {
  try {
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
      fs.mkdirSync(credentialLocation.folder);
    }

    if (options.clientId) {
      cred.clientId = options.clientId;
    }
    if (options.apiKey) {
      cred.apiKey = options.apiKey;
    }
    if (options.clientSecret) {
      cred.clientSecret = options.clientSecret;
    }
    if (options.cardKey) {
      cred.cardKey = options.cardKey;
    }
    if (options.openaiKey) {
      cred.openaiKey = options.openaiKey;
    }
    if (options.sandboxKey) {
      cred.sandboxKey = options.sandboxKey;
    }
    await fs.writeFileSync(credentialLocation.filename, JSON.stringify(cred));
    console.log("🔑 credentials saved");
  } catch (error: any) {
    handleCliError(error, options, "set config");
  }
}
