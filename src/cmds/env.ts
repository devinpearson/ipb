import chalk from 'chalk'
import fs from 'fs'
import { fetchEnv, getAccessToken } from "../api.js"
import { credentials, printTitleBox } from "../index.js"
interface Options {
    cardKey: number
    filename: string
}
export async function envCommand(options: Options) {
    try {
        printTitleBox()
        const token = await getAccessToken(credentials.host, credentials.clientId, credentials.secret, credentials.apikey)
        console.log('fetching envs');
        console.log(' ')
        const result = await fetchEnv(options.cardKey, credentials.host, token)
        // console.log(result);
        console.log(`saving to file: ${options.filename}`);
        fs.writeFileSync(options.filename, JSON.stringify(result, null, 4));
        } catch (err) {
            if (err instanceof Error) {
                console.log(chalk.red(err.message));
        } else {
            console.log(chalk.red('An unknown error occurred'));
        }
    }
}