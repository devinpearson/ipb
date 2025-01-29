#!/usr/bin/env node
import 'dotenv/config'
import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { commands } from './cmds/index.js'

export const credentials = {
    host: process.env.host || '',
    clientId: process.env.clientId || '',
    secret: process.env.secret || '',
    apikey: process.env.apikey || ''
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

  