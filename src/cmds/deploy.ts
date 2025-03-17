import fs from "fs";
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
}
export async function deployCommand(options: Options) {
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
    const rawVar = { variables: {} };
    const data = fs.readFileSync(`.env.${options.env}`, "utf8");
    let lines = data.split("\n");

    rawVar.variables = convertToJson(lines);
    await api.uploadEnv(options.cardKey, rawVar);
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
