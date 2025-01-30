import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import { createTransaction, run } from "programmable-card-code-emulator"
import type { CommandModule } from "yargs"

export const runCmd: CommandModule = {
    command: 'run',
    describe: 'run your code locally',
    builder: {
        filename: {
            alias: 'f',
            type: 'string',
            describe: 'the filename'
        },
        env: {
            alias: 'e',
            describe: 'env to run',
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
        const templatePath = path.join(path.resolve(), argv.filename);
        if (!fs.existsSync(templatePath)) {
            // The template doesnt exist, process exit
            console.log(chalk.red(`${template} does not exist`));
            process.exit(0);
        }
        console.log(chalk.white(`Running code:`), chalk.blueBright(template));
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

        let environmentvariables: { [key: string]: string } = {};
        if (argv.env) {
            if (!fs.existsSync(`.env.${argv.env}`)) {
                throw new Error('Env does not exist');
            }

            const data = fs.readFileSync(`.env.${argv.env}`, 'utf8');
            let lines = data.split("\n");

            environmentvariables = convertToJson(lines);
        }
        // Convert the environmentvariables to a string
        let environmentvariablesString = JSON.stringify(environmentvariables);
        const code = fs.readFileSync(path.join(path.resolve(), argv.filename), 'utf8');
        // Run the code
        const executionItems = await run(transaction, code, environmentvariablesString);
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

function convertToJson(arr: string[]) {
    let output: { [key: string]: string } = {};
    for (let i = 0; i < arr.length; i++) {
        let line = arr[i];

        if (line !== "\r") {
            let txt = line?.trim();

            if (line) {
                let key = line.split("=")[0]?.trim();
                let value = line.split("=")[1]?.trim();
                if (key && value) {
                    output[key] = value;
                }
            }
        }
    }
    return output;
}