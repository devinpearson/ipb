import chalk from 'chalk'
import fs from 'fs'
import { fetchPublishedCode, getAccessToken } from "../api.js"
import { credentials } from "../index.js"
import type { CommandModule } from "yargs"
export const publishedCmd: CommandModule = {
    command: 'fetch-published [cardkey] [filename]',
    describe: 'fetches your published code',
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
        },
        overwrite: {
            alias: 'y',
            default: false,
            describe: 'overwrite the file',
            type: 'boolean',
        }
    },
    handler: async function (argv: any) {
        try {
            if (fs.existsSync(argv.filename) && !argv.overwrite) {
                throw new Error('File already exists, overwrite with -y');
            }
            const token = await getAccessToken(credentials.host, credentials.clientId, credentials.secret, credentials.apikey)
            console.log('fetching code');
            const result = await fetchPublishedCode(argv.cardkey, credentials.host, token)
            console.log(result);
            await fs.writeFileSync(argv.filename, result);
        } catch (err) {
            if (err instanceof Error) {
                console.log(chalk.red(err.message));
            } else {
                console.log(chalk.red('An unknown error occurred'));
            }
        }
    }
}