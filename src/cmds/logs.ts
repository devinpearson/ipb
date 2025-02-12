import chalk from 'chalk'
import fs from 'fs'
import { fetchExecutions, getAccessToken } from "../api.js"
import { credentials, printTitleBox } from "../index.js"
interface Options {
    cardKey: number
    filename: string
}
export async function logsCommand(options: Options) {
    try {
        if (options.cardKey === undefined) {
            if (credentials.cardkey === '') {
            throw new Error('cardkey is required');
            }
            options.cardKey = Number(credentials.cardkey);
        }
        if (options.filename === undefined || options.filename === '') {
            throw new Error('filename is required');
        }
        printTitleBox()
        const token = await getAccessToken(credentials.host, credentials.clientId, credentials.secret, credentials.apikey)
        console.log('📊 fetching execution items');
        console.log(' ')
        const result = await fetchExecutions(options.cardKey, credentials.host, token)
        console.log(`saving to file: ${options.filename}`);
        fs.writeFileSync(options.filename, JSON.stringify(result.data.result.executionItems, null, 4));
    } catch (err) {
        if (err instanceof Error) {
            console.log(chalk.red(err.message));
        } else {
            console.log(chalk.red('An unknown error occurred'));
        }
    }
}