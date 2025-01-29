import chalk from 'chalk'
import fs from 'fs'
import { getAccessToken, toggleCode } from "../api.js"
import { credentials } from "../index.js"
import type { CommandModule } from "yargs"
export const toggleCmd: CommandModule = {
    command: 'toggle [cardkey] [enabled]',
    describe: 'enable/disable card code',
    builder: {
        cardkey: {
            type: 'number',
            default: 700615,
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