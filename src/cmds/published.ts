import fs from "fs";
import { fetchPublishedCode, getAccessToken } from "../api.js";
import { credentials, printTitleBox } from "../index.js";
interface Options {
  cardKey: number;
  filename: string;
}
export async function publishedCommand(options: Options) {
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
  console.log("fetching code...");
  const result = await fetchPublishedCode(
    options.cardKey,
    credentials.host,
    token,
  );
  console.log(`saving to file: ${options.filename}`);
  await fs.writeFileSync(options.filename, result);
  console.log("code saved to file");
}
