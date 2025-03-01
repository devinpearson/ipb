import fs from "fs";
import { credentialLocation } from "../index.js";
interface Options {
  clientId: string;
  clientSecret: string;
  apiKey: string;
  cardKey: string;
}
export async function configCommand(options: Options) {
  let cred = {
    clientId: "",
    clientSecret: "",
    apiKey: "",
    cardKey: "",
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
  await fs.writeFileSync(credentialLocation.filename, JSON.stringify(cred));
  console.log("🔑 credentials saved");
  console.log("");
}
