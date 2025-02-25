import fs from "fs";
import { fetchCode, getAccessToken } from "../api.js";
import { credentials, printTitleBox } from "../index.js";
interface Options {
  cardKey: number;
  filename: string;
}
export async function fetchCommand(options: Options) {
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
  console.log(" ");
  const result = await fetchCode(options.cardKey, credentials.host, token);
  // console.log(result);
  console.log(`saving to file: ${options.filename}`);
  console.log("code saved to file");
  await fs.writeFileSync(options.filename, result.code);
}
