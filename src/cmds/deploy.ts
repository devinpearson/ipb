import chalk from 'chalk'
import fs from 'fs'
import { getAccessToken, uploadCode, uploadEnv, uploadPublishedCode } from "../api.js"
import { credentials, printTitleBox } from "../index.js"
interface Options {
    cardKey: number
    filename: string
    env: string
}
export async function deployCommand(options: Options) {
    try {
        if (options.cardKey === undefined) {
                if (credentials.cardkey === '') {
                throw new Error('card-key is required');
                }
                options.cardKey = Number(credentials.cardkey);
        }
        printTitleBox()
        const token = await getAccessToken(credentials.host, credentials.clientId, credentials.secret, credentials.apikey)
        if (options.env) {
            if (!fs.existsSync(`.env.${options.env}`)) {
                throw new Error('Env does not exist');
            }
            const rawVar = {"variables": {}}
            const data = fs.readFileSync(`.env.${options.env}`, 'utf8');
            let lines = data.split("\n");

            rawVar.variables = convertToJson(lines);
            await uploadEnv(options.cardKey, rawVar, credentials.host, token)
            console.log('📦 env deployed');
        }
        console.log('🚀 deploying code');
        const raw = {"code": ""}
        const code = fs.readFileSync(options.filename).toString();
        raw.code = code;
        const saveResult = await uploadCode(options.cardKey, raw, credentials.host, token)
        // console.log(saveResult);
        const result = await uploadPublishedCode(options.cardKey, saveResult.data.result.codeId, code, credentials.host, token)
        if (result.data.result.codeId) {
            console.log('🎉 code deployed');
        }
    } catch (err) {
        if (err instanceof Error) {
            console.log(chalk.red(err.message));
        } else {
            console.log(chalk.red('An unknown error occurred'));
        }
    }
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