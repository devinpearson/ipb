import chalk from 'chalk'
import fs from 'fs'
import { fetchCode, getAccessToken } from "../api.js"
import { credentials } from "../index.js"
import type { CommandModule } from "yargs"
export const fetchCmd: CommandModule = {
    command: 'fetch [cardkey] [filename]',
    describe: 'fetches your saved code',
    builder: {
        cardkey: {
            type: 'number',
            describe: 'the cardkey'
        },
        filename: {
            type: 'string',
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
            console.log(argv.cardkey, argv.filename);
            const result = await fetchCode(argv.cardkey, credentials.host, token)
            console.log(result);
            await fs.writeFileSync(argv.filename, result.code);
        } catch (err) {
            if (err instanceof Error) {
                console.log(chalk.red(err.message));
            } else {
                console.log(chalk.red('An unknown error occurred'));
            }
        }
    }
}