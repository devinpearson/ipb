import fs from 'fs'
import { getAccessToken, uploadPublishedCode } from "../api.js"
import { credentials, printTitleBox } from "../index.js"
interface Options {
    cardKey: number
    filename: string
    codeId: string
}
export async function publishCommand(options: Options) {
    if (!fs.existsSync(options.filename)) {
        throw new Error('File does not exist');
    }
    if (options.cardKey === undefined) {
        if (credentials.cardkey === '') {
            throw new Error('card-key is required');
        }
        options.cardKey = Number(credentials.cardkey);
    }
    printTitleBox()
    const token = await getAccessToken(credentials.host, credentials.clientId, credentials.secret, credentials.apikey)
    console.log('🚀 publishing code...');
    const code = fs.readFileSync(options.filename).toString();
    const result = await uploadPublishedCode(options.cardKey, options.codeId, code, credentials.host, token)
    console.log(`code published with codeId: ${result.data.result.codeId}`);
}