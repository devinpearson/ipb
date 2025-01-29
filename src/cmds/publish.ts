import chalk from 'chalk'
import fs from 'fs'
import { getAccessToken, uploadPublishedCode } from "../api.js"
import { credentials } from "../index.js"
import type { CommandModule } from "yargs"
export const publishCmd: CommandModule = {
    command: 'publish [cardkey] [codeid] [filename]',
    describe: 'publishes your saved code',
    builder: {
        cardkey: {
            type: 'number',
            default: 700615,
            describe: 'the cardkey'
        },
        codeid: {
            type: 'string',
            default: '',
            describe: 'the saved code id'
        },
        filename: {
            type: 'string',
            default: 'data/main.js',
            describe: 'the filename'
        }
    },
    handler: async function (argv: any) {
        try {
            if (!fs.existsSync(argv.filename)) {
                throw new Error('File does not exist');
            }
            const token = await getAccessToken(credentials.host, credentials.clientId, credentials.secret, credentials.apikey)
            console.log('uploading code');
            const code = fs.readFileSync(argv.filename).toString();
            const result = await uploadPublishedCode(argv.cardkey, argv.codeid, code, credentials.host, token)
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