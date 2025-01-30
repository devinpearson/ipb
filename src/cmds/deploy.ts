import chalk from 'chalk'
import fs from 'fs'
import { getAccessToken, uploadCode, uploadEnv, uploadPublishedCode } from "../api.js"
import { credentials } from "../index.js"
import type { CommandModule } from "yargs"
export const deployCmd: CommandModule = {
    command: 'deploy',
    describe: 'deploys your code to your card',
    builder: {
        cardkey: {
            alias: 'c',
            type: 'number',
            describe: 'the cardkey'
        },
        filename: {
            alias: 'f',
            type: 'string',
            default: 'main.js',
            describe: 'the filename'
        },
        env: {
            alias: 'e',
            describe: 'env to run',
            type: 'string',
        },
        
    },
    handler: async function (argv: any) {
        try {
            if (argv.cardkey === undefined) {
                 if (credentials.cardkey === '') {
                    throw new Error('cardkey is required');
                 }
                 argv.cardkey = credentials.cardkey;
            }
            const token = await getAccessToken(credentials.host, credentials.clientId, credentials.secret, credentials.apikey)
            if (argv.env) {
                if (!fs.existsSync(`.env.${argv.env}`)) {
                    throw new Error('Env does not exist');
                }
                const rawVar = {"variables": {}}
                const data = fs.readFileSync(`.env.${argv.env}`, 'utf8');
                let lines = data.split("\n");

                rawVar.variables = convertToJson(lines);
                const resultVar = await uploadEnv(argv.cardkey, rawVar, credentials.host, token)
                console.log('📦 env deployed');
            }
            console.log('🚀 deploying code');
            const raw = {"code": ""}
            const code = fs.readFileSync(argv.filename).toString();
            raw.code = code;
            const saveResult = await uploadCode(argv.cardkey, raw, credentials.host, token)
            // console.log(saveResult);
            const result = await uploadPublishedCode(argv.cardkey, saveResult.data.result.codeId, code, credentials.host, token)
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