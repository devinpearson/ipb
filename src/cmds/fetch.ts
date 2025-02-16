import fs from 'fs'
import { fetchCode, getAccessToken } from "../api.js"
import { credentials, printTitleBox } from "../index.js"
interface Options {
    cardKey: number
    filename: string
}
export async function fetchCommand(options: Options) {
    if (options.cardKey === undefined) {
        if (credentials.cardkey === '') {
            throw new Error('cardkey is required');
        }
        options.cardKey = Number(credentials.cardkey);
    }
    printTitleBox()
    const token = await getAccessToken(credentials.host, credentials.clientId, credentials.secret, credentials.apikey)
    console.log('fetching code');
    console.log(' ')
    console.log(options.cardKey, options.filename);
    const result = await fetchCode(options.cardKey, credentials.host, token)
    // console.log(result);
    console.log(`saving to file: ${options.filename}`);
    await fs.writeFileSync(options.filename, result.code);
}