import fs from "fs";
import { fetchPublishedCode, getAccessToken } from "../api.js";
import { credentials, printTitleBox } from "../index.js";
interface Options {
  cardKey: number;
  filename: string;
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
}
export async function publishedCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new Error("card-key is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
  printTitleBox();
  if (options.apiKey) {
    credentials.apiKey = options.apiKey;
  }
  if (options.clientId) {
    credentials.clientId = options.clientId;
  }
  if (options.clientSecret) {
    credentials.clientSecret = options.clientSecret;
  }
  if (options.host) {
    credentials.host = options.host;
  }
  const token = await getAccessToken(
    credentials.host,
    credentials.clientId,
    credentials.clientSecret,
    credentials.apiKey,
  );
  console.log("fetching code...");
  const result = await fetchPublishedCode(
    options.cardKey,
    credentials.host,
    token,
  );
  console.log(`💾 saving to file: ${options.filename}`);
  await fs.writeFileSync(options.filename, result);
  console.log("🎉 code saved to file");
  console.log("");
}
