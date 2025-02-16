import { getAccessToken, toggleCode } from "../api.js"
import { credentials, printTitleBox } from "../index.js"
interface Options {
    cardKey: number
}
export async function disableCommand(options: Options)  {
    printTitleBox()
    if (options.cardKey === undefined) {
            if (credentials.cardkey === '') {
            throw new Error('cardkey is required');
            }
            options.cardKey = Number(credentials.cardkey);
    }
    const token = await getAccessToken(credentials.host, credentials.clientId, credentials.secret, credentials.apikey)
    console.log('toggle code');
    const result = await toggleCode(options.cardKey, false, credentials.host, token)
    console.log(result);
}