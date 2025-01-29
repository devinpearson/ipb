import chalk from 'chalk'
import fs from 'fs'
import { fetchEnv, getAccessToken } from "../api.js"
import { credentials } from "../index.js"
import type { CommandModule } from "yargs"
export const envsCmd: CommandModule = {
    command: 'fetch-env [cardkey] [filename]',
    describe: 'fetches your environmental variables',
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
            console.log('fetching envs');
            const result = await fetchEnv(argv.cardkey, credentials.host, token)
            console.log(result);
            fs.writeFileSync(argv.filename, JSON.stringify(result, null, 4));
            } catch (err) {
                if (err instanceof Error) {
                    console.log(chalk.red(err.message));
            } else {
                console.log(chalk.red('An unknown error occurred'));
            }
        }
    }
}