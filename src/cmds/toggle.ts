import chalk from 'chalk'
import { getAccessToken, toggleCode } from "../api.js"
import { credentials, printTitleBox } from "../index.js"
interface Options {
    cardKey: number
}
export async function enableCommand(options: Options)  {
    try {
        if (options.cardKey === undefined) {
                if (credentials.cardkey === '') {
                throw new Error('cardkey is required');
                }
                options.cardKey = Number(credentials.cardkey);
        }
        printTitleBox()
        const token = await getAccessToken(credentials.host, credentials.clientId, credentials.secret, credentials.apikey)
        console.log('toggle code');
        const result = await toggleCode(options.cardKey, true, credentials.host, token)
        console.log(result);
    } catch (err) {
        if (err instanceof Error) {
            console.log(chalk.red(err.message));
        } else {
            console.log(chalk.red('An unknown error occurred'));
        }
    }
}