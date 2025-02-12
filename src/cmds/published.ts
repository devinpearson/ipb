import chalk from 'chalk'
import fs from 'fs'
import { fetchPublishedCode, getAccessToken } from "../api.js"
import { credentials, printTitleBox } from "../index.js"
interface Options {
    cardKey: number
    filename: string
}
export async function publishedCommand(options: Options) {
    try {
        if (!fs.existsSync(options.filename)) {
            throw new Error('File does not exist');
        }
        printTitleBox()
        const token = await getAccessToken(credentials.host, credentials.clientId, credentials.secret, credentials.apikey)
        console.log('fetching code');
        const result = await fetchPublishedCode(options.cardKey, credentials.host, token)
        console.log(result);
        await fs.writeFileSync(options.filename, result);
    } catch (err) {
        if (err instanceof Error) {
            console.log(chalk.red(err.message));
        } else {
            console.log(chalk.red('An unknown error occurred'));
        }
    }
}