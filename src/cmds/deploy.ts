import fs from "fs";
import {
  getAccessToken,
  uploadCode,
  uploadEnv,
  uploadPublishedCode,
} from "../api.js";
import { credentials, printTitleBox } from "../index.js";
interface Options {
  cardKey: number;
  filename: string;
  env: string;
  host: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  credentialsFile: string;
}
export async function deployCommand(options: Options) {
  if (options.cardKey === undefined) {
    if (credentials.cardKey === "") {
      throw new Error("card-key is required");
    }
    options.cardKey = Number(credentials.cardKey);
  }
  printTitleBox();
  if (options.credentialsFile) {
    const file = await import("file://" + options.credentialsFile, {
      with: { type: "json" },
    });
    if (file.host) {
      credentials.host = file.host;
    }
    if (file.apiKey) {
      credentials.apiKey = file.apiKey;
    }
    if (file.clientId) {
      credentials.clientId = file.clientId;
    }
    if (file.clientSecret) {
      credentials.clientSecret = file.clientSecret;
    }
  }
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
  if (options.env) {
    if (!fs.existsSync(`.env.${options.env}`)) {
      throw new Error("Env does not exist");
    }
    const rawVar = { variables: {} };
    const data = fs.readFileSync(`.env.${options.env}`, "utf8");
    let lines = data.split("\n");

    rawVar.variables = convertToJson(lines);
    await uploadEnv(options.cardKey, rawVar, credentials.host, token);
    console.log("📦 env deployed");
  }
  console.log("🚀 deploying code");
  const raw = { code: "" };
  const code = fs.readFileSync(options.filename).toString();
  raw.code = code;
  const saveResult = await uploadCode(
    options.cardKey,
    raw,
    credentials.host,
    token,
  );
  // console.log(saveResult);
  const result = await uploadPublishedCode(
    options.cardKey,
    saveResult.data.result.codeId,
    code,
    credentials.host,
    token,
  );
  if (result.data.result.codeId) {
    console.log("🎉 code deployed");
  }
  console.log("");
}

function convertToJson(arr: string[]) {
  let output: { [key: string]: string } = {};
  for (let i = 0; i < arr.length; i++) {
    let line = arr[i];

    if (line !== "\r") {
      let txt = line?.trim();

      if (line) {
        let key = line.split("=")[0]?.trim();
        let value = line.split("=")[1]?.trim();
        if (key && value) {
          output[key] = value;
        }
      }
    }
  }
  return output;
}
