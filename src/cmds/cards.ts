import chalk from 'chalk'
import { fetchCards, getAccessToken } from "../api.js"
import { credentials } from "../index.js"
import type { CommandModule } from "yargs"
export const cardsCmd: CommandModule = {
    command: 'fetch-cards',
    describe: 'Gets a list of cards',
    
    handler: async function (argv: any) {
        try {
            const token = await getAccessToken(credentials.host, credentials.clientId, credentials.secret, credentials.apikey)
            console.log('fetching cards');
            const result = await fetchCards(credentials.host, token)
            console.table(result);
        } catch (err) {
            if (err instanceof Error) {
                console.log(chalk.red(err.message));
            } else {
                console.log(chalk.red('An unknown error occurred'));
            }
        }
    }
}