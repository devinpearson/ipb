import { getAccessToken, toggleCode } from "../api.js";
import { credentials, printTitleBox } from "../index.js";
interface Options {
  cardKey: number;
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
}
export async function disableCommand(options: Options) {
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
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new Error("cardkey is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
  const token = await getAccessToken(
    credentials.host,
    credentials.clientId,
    credentials.clientSecret,
    credentials.apiKey,
  );
  console.log("⚙ disabling code on card...");
  const result = await toggleCode(
    options.cardKey,
    false,
    credentials.host,
    token,
  );
  if (!result) {
    console.log("❌ code disabled");
  } else {
    console.log("✅ code disable failed");
  }
  console.log("");
}
