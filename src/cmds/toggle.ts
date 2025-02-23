import { getAccessToken, toggleCode } from "../api.js"
import { credentials, printTitleBox } from "../index.js"
interface Options {
    cardKey: number
}
export async function enableCommand(options: Options)  {
    if (options.cardKey === undefined) {
            if (credentials.cardkey === '') {
            throw new Error('card-key is required');
            }
            options.cardKey = Number(credentials.cardkey);
    }
    printTitleBox()
    const token = await getAccessToken(credentials.host, credentials.clientId, credentials.secret, credentials.apikey)
    console.log('enabling code on card...');
    const result = await toggleCode(options.cardKey, true, credentials.host, token)
    if (result) {
        console.log('code enabled');
    }
    else {
        console.log('code enable failed');
    }
}