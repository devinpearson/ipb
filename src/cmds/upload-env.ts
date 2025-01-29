import chalk from 'chalk'
import fs from 'fs'
import { getAccessToken, uploadEnv } from "../api.js"
import { credentials } from "../index.js"
import type { CommandModule } from "yargs"
export const uploadEnvsCmd: CommandModule = {
    command: 'upload-env [cardkey] [filename]',
    describe: 'publishes your environmental variables',
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
            if (!fs.existsSync(argv.filename)) {
                throw new Error('File does not exist');
            }
            
            const token = await getAccessToken(credentials.host, credentials.clientId, credentials.secret, credentials.apikey)
            console.log('uploading env');
            const raw = {"variables": {}}
            const variables = fs.readFileSync(argv.filename, 'utf8');
            // fetch env_vars from file
            //loop through env_vars
            //replace env_vars with values
            // const replaceEnv = process.env.filter((ev) => ev.startsWith("REPLACE_"));
            //variables.replace(searchValue, replaceValue)
            raw.variables = JSON.parse(variables);
            const result = await uploadEnv(argv.cardkey, raw, credentials.host, token)
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