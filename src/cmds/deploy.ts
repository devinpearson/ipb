import chalk from 'chalk'
import fs from 'fs'
import { getAccessToken, uploadCode, uploadPublishedCode } from "../api.js"
import { credentials } from "../index.js"
import type { CommandModule } from "yargs"
export const deployCmd: CommandModule = {
    command: 'deploy',
    describe: 'deploys your code to your card',
    builder: {
        cardkey: {
            alias: 'c',
            type: 'number',
            default: 700615,
            describe: 'the cardkey'
        },
        filename: {
            alias: 'f',
            type: 'string',
            default: 'main.js',
            describe: 'the filename'
        },
        environment: {
            alias: 'e',
            describe: 'env to run',
            default: 'env.json',
            type: 'string',
        },
        
    },
    handler: async function (argv: any) {
        try {
            const token = await getAccessToken(credentials.host, credentials.clientId, credentials.secret, credentials.apikey)
            console.log('deploying code');
            const raw = {"code": ""}
            const code = fs.readFileSync(argv.filename).toString();
            raw.code = code;
            const saveResult = await uploadCode(argv.cardkey, raw, credentials.host, token)
            // console.log(saveResult);
            const result = await uploadPublishedCode(argv.cardkey, saveResult.data.result.codeId, code, credentials.host, token)
            console.log(result);
        } catch (err) {
            if (err instanceof Error) {
                console.log(chalk.red(err.message));
            } else {
                console.log(chalk.red('An unknown error occurred'));
            }
        }
    }
}