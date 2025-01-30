import chalk from 'chalk'
import fs from 'fs'
import { fetchExecutions, getAccessToken } from "../api.js"
import { credentials } from "../index.js"
import type { CommandModule } from "yargs"
export const executionsCmd: CommandModule = {
    command: 'executions',
    describe: 'card execution logs',
    builder: {
        cardkey: {
            alias: 'c',
            type: 'number',
            describe: 'the cardkey'
        },
        filename: {
            alias: 'f',
            type: 'string',
            default: 'executions.json',
            describe: 'the filename'
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
                console.log('📊 fetching execution items');
                const result = await fetchExecutions(argv.cardkey, credentials.host, token)
                console.log(result.data.result.executionItems);
                fs.writeFileSync(argv.filename, JSON.stringify(result.data.result.executionItems, null, 4));
            } catch (err) {
                if (err instanceof Error) {
                    console.log(chalk.red(err.message));
                } else {
                    console.log(chalk.red('An unknown error occurred'));
                }
            }
        }
    }