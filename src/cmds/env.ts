import fs from "fs";
import { fetchEnv, getAccessToken } from "../api.js";
import { credentials, printTitleBox } from "../index.js";
interface Options {
  cardKey: number;
  filename: string;
}
export async function envCommand(options: Options) {
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
  console.log("💎 fetching envs");
  console.log(" ");
  const result = await fetchEnv(options.cardKey, credentials.host, token);
  // console.log(result);
  console.log(`saving to file: ${options.filename}`);
  fs.writeFileSync(options.filename, JSON.stringify(result, null, 4));
  console.log("envs saved to file");
}
