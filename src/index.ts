#!/usr/bin/env node
import 'dotenv/config'
import process from 'process'
import fs from 'fs'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { commands } from './cmds/index.js'
import {homedir}  from 'os'
const home = homedir()
let cred = {
    clientId: '',
    clientSecret: '',
    apiKey: '',
    cardKey: ''
}
if (fs.existsSync(`${home}/.ipb/.credentials.json`)) {
                cred = JSON.parse(fs.readFileSync(`${home}/.ipb/.credentials.json`, 'utf8'));
}
export const credentials = {
    host: process.env.host || 'https://openapi.investec.com',
    clientId: process.env.clientId || cred.clientId,
    secret: process.env.secret || cred.clientSecret,
    apikey: process.env.apikey || cred.apiKey,
    cardkey: process.env.cardkey || cred.cardKey
}
yargs(hideBin(process.argv))
  //.usage('Usage: $0 [options]')
//   .usage('$0 <cmd> [args]')
  .command(commands)
  .demandCommand()
//   .fail(false)
  .help('h')
  .alias('h', 'help')
  .alias('v', 'version').argv;

  