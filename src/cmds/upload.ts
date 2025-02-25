import fs from "fs";
import { getAccessToken, uploadCode } from "../api.js";
import { credentials, printTitleBox } from "../index.js";
interface Options {
  cardKey: number;
  filename: string;
}
export async function uploadCommand(options: Options) {
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
  console.log("🚀 uploading code");
  const raw = { code: "" };
  const code = fs.readFileSync(options.filename).toString();
  raw.code = code;
  const result = await uploadCode(
    options.cardKey,
    raw,
    credentials.host,
    token,
  );
  console.log(`code uploaded with codeId: ${result.data.result.codeId}`);
}
