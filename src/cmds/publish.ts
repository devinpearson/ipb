import chalk from 'chalk'
import fs from 'fs'
import { getAccessToken, uploadPublishedCode } from "../api.js"
import { credentials, printTitleBox } from "../index.js"
interface Options {
    cardKey: number
    filename: string
    codeId: string
}
export async function publishCommand(options: Options) {
    try {
        if (!fs.existsSync(options.filename)) {
            throw new Error('File does not exist');
        }
        printTitleBox()
        const token = await getAccessToken(credentials.host, credentials.clientId, credentials.secret, credentials.apikey)
        console.log('uploading code');
        const code = fs.readFileSync(options.filename).toString();
        const result = await uploadPublishedCode(options.cardKey, options.codeId, code, credentials.host, token)
        console.log(result);
    } catch (err) {
        if (err instanceof Error) {
            console.log(chalk.red(err.message));
        } else {
            console.log(chalk.red('An unknown error occurred'));
        }
    }
}