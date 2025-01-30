import chalk from 'chalk'
import fs from 'fs'
import { getAccessToken, toggleCode } from "../api.js"
import { credentials } from "../index.js"
import type { CommandModule } from "yargs"
export const toggleCmd: CommandModule = {
    command: 'toggle [enabled]',
    describe: 'enable/disable card code',
    builder: {
        cardkey: {
            alias: 'c',
            type: 'number',
            describe: 'the cardkey'
        },
        enabled: {
            type: 'boolean',
            default: true,
            describe: 'Whether the card is enabled or not'
        }
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
            console.log('toggle code');
            const result = await toggleCode(argv.cardkey, argv.enabled, credentials.host, token)
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