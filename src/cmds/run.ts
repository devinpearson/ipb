import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import { createTransaction, run } from "programmable-card-code-emulator"
import type { CommandModule } from "yargs"
export const runCmd: CommandModule = {
    command: 'run [filename]',
    describe: 'run your code locally',
    builder: {
        filename: {
            type: 'string',
            default: 'data/main.js',
            describe: 'the filename'
        },
        environment: {
            alias: 'e',
            describe: 'env to run',
            default: 'env.json',
            type: 'string',
        },
        amount: {
            alias: 'a',
            describe: 'amount in cents',
            default: 10000,
            type: 'number',
        },
        currency: {
            alias: 'c',
            describe: 'currency code',
            default: 'zar',
            type: 'string',
        },
        mcc: {
            describe: 'merchant category code',
            default: '0000',
            type: 'string',
        },
        merchant: {
            alias: 'm',
            describe: 'merchant name',
            default: 'The Coders Bakery',
            type: 'string',
        },
        city: {
            alias: 'i',
            describe: 'merchant city',
            default: 'Cape Town',
            type: 'string',
        },
        country: {
            alias: 'o',
            describe: 'merchant country',
            default: 'ZA',
            type: 'string',
        }
    },
    handler: async function (argv: any) {
    try {
        const template = argv.filename;
        const templatePath = path.join(path.resolve(), template);
        if (!fs.existsSync(templatePath)) {
        // The template doesnt exist, process exit
        console.log(chalk.red(`Template ${template} does not exist`));
        process.exit(0);
        }
            console.log(chalk.white(`Running template:`), chalk.blueBright(template));
        const transaction = createTransaction(
            argv.currency,
            argv.amount,
            argv.mcc,
            argv.merchant,
            argv.city,
            argv.country
        );
        console.log(chalk.blue(`currency:`), chalk.green(transaction.currencyCode));
        console.log(chalk.blue(`amount:`), chalk.green(transaction.centsAmount));
        console.log(chalk.blue(`merchant code:`), chalk.green(transaction.merchant.category.code));
        console.log(chalk.blue(`merchant name:`), chalk.greenBright(transaction.merchant.name));
        console.log(chalk.blue(`merchant city:`), chalk.green(transaction.merchant.city));
        console.log(chalk.blue(`merchant country:`), chalk.green(transaction.merchant.country.code));
        // Read the template env.json file and replace the values with the process.env values
        let environmentvariables = JSON.parse(
            fs.readFileSync(path.join(path.resolve(), argv.environment), 'utf8')
        );
        for (const key in environmentvariables) {
            if (`${key}` in process.env) {
            environmentvariables[`${key}`] = process.env[`${key}`];
            }
        }
        // Convert the environmentvariables to a string
        environmentvariables = JSON.stringify(environmentvariables);
        const code = fs.readFileSync(path.join(path.resolve(), argv.filename), 'utf8');
        // Run the code
        const executionItems = await run(transaction, code, environmentvariables);
        executionItems.forEach((item) => {
            console.log('\n💻 ', chalk.green(item.type));
            item.logs.forEach((log) => {
            console.log('\n', chalk.yellow(log.level), chalk.white(log.content));
            });
        });
        } catch (err) {
            if (err instanceof Error) {
                console.log(chalk.red(err.message));
            } else {
                console.log(chalk.red('An unknown error occurred'));
            }
        }
    }
}