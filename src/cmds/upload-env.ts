import fs from "fs";
import { getAccessToken, uploadEnv } from "../api.js";
import { credentials, printTitleBox } from "../index.js";
interface Options {
  cardKey: number;
  filename: string;
}
export async function uploadEnvCommand(options: Options) {
  if (!fs.existsSync(options.filename)) {
    throw new Error("File does not exist");
  }
  if (options.cardKey === undefined) {
    if (credentials.cardkey === "") {
      throw new Error("card-key is required");
    }
    options.cardKey = Number(credentials.cardkey);
  }
  printTitleBox();
  const token = await getAccessToken(
    credentials.host,
    credentials.clientId,
    credentials.secret,
    credentials.apikey,
  );
  console.log("🚀 uploading env");
  const raw = { variables: {} };
  const variables = fs.readFileSync(options.filename, "utf8");
  raw.variables = JSON.parse(variables);
  const result = await uploadEnv(options.cardKey, raw, credentials.host, token);
  console.log(`🎉 env uploaded`);
  console.log("");
}
