import chalk from 'chalk'
import fs from 'fs'
import { getAccessToken, uploadCode } from "../api.js"
import { credentials } from "../index.js"
import type { CommandModule } from "yargs"
export const uploadCmd: CommandModule = {
    command: 'upload [cardkey] [filename]',
    describe: 'uploads your code to saved code',
    builder: {
        cardkey: {
            type: 'number',
            default: 700615,
            describe: 'the cardkey'
        },
        filename: {
            type: 'string',
            default: 'data/main.js',
            describe: 'the filename'
        }
    },
    handler: async function (argv: any) {
        try {
            const token = await getAccessToken(credentials.host, credentials.clientId, credentials.secret, credentials.apikey)
            console.log('uploading code');
            const raw = {"code": ""}
            const code = fs.readFileSync(argv.filename).toString();
            raw.code = code;
            const result = await uploadCode(argv.cardkey, raw, credentials.host, token)
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