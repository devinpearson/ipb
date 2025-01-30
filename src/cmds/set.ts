import chalk from 'chalk'
import fs from 'fs'
import type { CommandModule } from "yargs"
import {homedir}  from 'os';
export const setCmd: CommandModule = {
    command: 'set',
    describe: 'set auth credentials',
    builder: {
        apiKey: {
            type: 'string',
            describe: 'Your api key for the Investec API'
        },
        clientId: {
            type: 'string',
            describe: 'Your client id for the Investec API'
        },
        clientSecret: {
            type: 'string',
            describe: 'Your client secret for the Investec API'
        },
        cardKey: {
            type: 'string',
            describe: 'Your default card key'
        }
    },
    handler: async function (argv: any) {
        const home = homedir()
        try {
            let cred = {
                clientId: '',
                clientSecret: '',
                apiKey: '',
                cardKey: ''
            }
            if (fs.existsSync(`${home}/.ipb/.credentials.json`)) {
                cred = JSON.parse(fs.readFileSync(`${home}/.ipb/.credentials.json`, 'utf8'));
            } else {
                fs.mkdirSync(`${home}/.ipb`)
            }
            
            if (argv.clientId) {
                cred.clientId = argv.clientId
            }
            if (argv.apiKey) {
                cred.apiKey = argv.apiKey
            }
            if (argv.clientSecret) {
                cred.clientSecret = argv.clientSecret
            }
            if (argv.cardKey) {
                cred.cardKey = argv.cardKey
            }
            await fs.writeFileSync(`${home}/.ipb/.credentials.json`, JSON.stringify(cred));
            console.log('Auth saved')
        } catch (err) {
            if (err instanceof Error) {
                console.log(chalk.red(err.message));
            } else {
                console.log(chalk.red('An unknown error occurred'));
            }
        }
    }
}