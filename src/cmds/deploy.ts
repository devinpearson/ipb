import fs from "fs";
import dotenv from "dotenv";
import { credentials, initializeApi } from "../index.js";
import chalk from "chalk";
interface Options {
  cardKey: number;
  filename: string;
  env: string;
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
  //verbose: boolean;
}
export async function deployCommand(options: Options) {
  let envObject = {};
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new Error("card-key is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }

  const api = await initializeApi(credentials, options);

  if (options.env) {
    if (!fs.existsSync(`.env.${options.env}`)) {
      throw new Error("Env does not exist");
    }
    envObject = dotenv.parse(fs.readFileSync(`.env.${options.env}`));

    await api.uploadEnv(options.cardKey, { variables: envObject });
    console.log("📦 env deployed");
  }
  console.log("🚀 deploying code");
  const raw = { code: "" };
  const code = fs.readFileSync(options.filename).toString();
  raw.code = code;
  const saveResult = await api.uploadCode(options.cardKey, raw);
  // console.log(saveResult);
  const result = await api.uploadPublishedCode(
    options.cardKey,
    saveResult.data.result.codeId,
    code,
  );
  if (result.data.result.codeId) {
    console.log("🎉 code deployed");
  }
  console.log("");
}
