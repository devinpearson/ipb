# Investec Programmable Banking CLI

Allows you to deploy your code directly to your card. It also includes a emulator to test your code locally.

## 🌟 Community-Powered Repository 🌟

This repository is crafted with ❤️ by our talented community members. It's a space for everyone to use, contribute to, and share. While it aligns with the spirit of our community, please note that this repo is not directly endorsed or supported by Investec. Always exercise caution and discretion when using or contributing to community-driven projects.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![NPM Version](https://img.shields.io/npm/v/investec-ipb)

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)
- [Other Projects](#other-projects)

## Installation

Before installing, [download and install Node.js](https://nodejs.org/en/download/).

To install or upgrade the CLI, run the following commands:

```sh
npm install -g investec-ipb
```

## Configuration

You can access your client id, client secret and api key from the Investec Developer Portal.
More information on how to access your keys can be found on the [Investec Developer Community Wiki](https://investec.gitbook.io/programmable-banking-community-wiki/get-started/api-quick-start-guide/how-to-get-your-api-keys).

To configure the CLI, run the following command:

```sh
ipb config --client-id <client-id> --client-secret <client-secret> --card-id <card-id>
```

If you want to set up specific environments for your code, you can set the environment variables in a `.env` file in the root of your project.

```sh
INVESTEC_HOST=https://openapi.investec.com
INVESTEC_CLIENT_ID=your-client-id
INVESTEC_CLIENT_SECRET=your-client-secret
INVESTEC_API_KEY=your-api-key
INVESTEC_CARD_KEY=your-card-key
```

You also have the option to specify the host, client id, client secret, api key and card id when calling each command. These will override the configuration set in the `.env` file and your credential file.

```sh
ipb deploy -f <filename> -e <environment> -c <card-id> --host <host> --client-id <client-id> --client-secret <client-secret> --api-key <api-key>
```

You can also create your own `.credentials.json` file and store and access it in a location you prefer. This file should be in the following format:

```json
{
  "client_id": "your-client-id",
  "client_secret": "your-client-secret",
  "api_key": "your-api-key",
  "card_id": "your-card-id"
}
```

To configure the CLI using a credentials file, run the following command:

```sh
ipb cards --credentials-file <path-to-credentials-file>
```

The card id is optional and can be set when calling each command. If you specify a card when calling a command, it will override the card id set in the configuration.

## Usage

There are six main commands that you can use to interact with the card:

- [`cards`](#cards): get a list of cards
- [`deploy`](#deploy): deploy code to the card
- [`logs`](#fetching-execution-logs): fetch execution logs
- [`run`](#run---local-simulation): run code locally
- [`new`](#new-project): scaffold a new project
- [`enable`](#enable-and-disable-code): enable code on the card
- [`disable`](#enable-and-disable-code): disable code on the card
- [`countries`](#countries): get a list of countries
- [`currencies`](#currencies): get a list of currencies
- [`merchants`](#merchants): get a list of merchants

There are also additional functions that you can use to interact with the card if you prefer handling the process yourself.

- `fetch`
- `upload`
- `env`
- `upload-env`
- `published`
- `publish`
- `simulate` (online simulator)

### Cards

To get a list of your cards with card keys, card number and whether the card is enabled for card code,

run the following command for card list:

```sh
ipb cards
```

![cards command](assets/cards.gif)

### Deploy

Code Deployment to your card.
for environment variables, you can set them in a `.env` file in the root of your project.
You should name your environments such as `.env.prod` or `.env.dev` and then specify the environment when running the command.
To call on these environments you will specify prod or dev as the environment.
This makes sure you dont upload the .env file for your current code project.

To deploy code to your card, run the following command:

```sh
ipb deploy -f <filename> -e <environment> -c <card-id>
```

![deploy command](assets/deploy.gif)

### Fetching Execution Logs

To fetch your execution logs and saving them to a file. This output is json format, example naming such as `executions.json` or `logs.json`,
This function will overwrite the file if it already exists.
run the following command to save the logs to the filename specified:

```sh
ipb logs -f <filename> -c <card-id>
```

![logs command](assets/logs.gif)

### Run - Local Simulation

You can run local simulation of your code and specify the transactions details as arguments.
The amount is is in cents and the currency is the ISO 4217 currency code.

The local emulator will run the code against the local files and not the card. It does not require an Investec account or any API keys. It runs locally without hitting the Investec API.

To run a transaction against your local files, run the following command:

```sh
ipb run -f main.js -e prod --amount 60000 --currency ZAR --mcc 0000 --merchant "Test Merchant" --city "Test City" --country ZA
```

![run command](assets/run.gif)

### New Project

To scaffold a new project, run the following command:

template is optional and can be set to `default` or `petro` to create a project using one of the templates

```sh
ipb new <project-name> --template <template-name>
```

![new command](assets/new.gif)

### Enable and Disable Code

To enable or disable code on your card, run the following commands:

```sh
ipb enable -c <card-id>
```

```sh
ipb disable -c <card-id>
```

![toggle command](assets/toggle.gif)

### AI Generated Code

You can use the AI generated code to generate code for your card. This is a work in progress and will be improved over time.

You will need a OpenAI API key to use this feature. You can set the API key in your environment variables or in a `.env` file in the root of your project.

To generate code for your card, run the following command:

```sh
ipb ai <prompt>
```

This will generate code based on the prompt you provide. The generated code will be saved to a file called `ai-generated.js` in the current directory.

If there is any environment variables that are required, it will be saved to a file called `.env.ai` in the current directory.

You can then run the code using the `run` command or deploy it to your card using the `deploy` command.

### Countries

Retrieve a list of countries that can be used in the card code.

```sh
ipb countries
```

### Currencies

Retrieve a list of currencies that can be used in the card code.

```sh
ipb currencies
```

### Merchants

Retrieve a list of merchants that can be used in the card code.

```sh
ipb merchants
```

### Fetch Code

To fetch the code saved on the card, run the following command:

```sh
ipb fetch -f <filename> -c <card-id>
```

### Upload Code

To upload code to the cards saved code, run the following command:

```sh
ipb upload -f <filename> -c <card-id>
```

### Fetch Environment Variables

To fetch the environment variables saved on the card, run the following command:

```sh
ipb env -f <filename> -c <card-id>
```

### Upload Environment Variables

To upload environment variables to the card, run the following command:

```sh
ipb upload-env -f <filename> -c <card-id>
```

### Fetch Published Code

To fetch the published code saved on the card, run the following command:

```sh
ipb published -f <filename> -c <card-id>
```

### Publish Code

To publish code to the card you will need the codeId returned when saving the code using the upload command, run the following command:

```sh
ipb publish -f <filename> --code-id <code-id> -c <card-id>
```

### Simulate Code

You can use the online simulator to test your code without deploying it to the card. This is very similar to the run command but it uses the online simulator instead of the local emulator. be aware that it will use your online env and not your local env.

```sh
ipb simulate -f main.js -c <card-key> --amount 60000 --currency ZAR --mcc 0000 --merchant "Test Merchant" --city "Test City" --country ZA
```

### CLI usage

Usage: ipb [options] [command]

CLI to manage Investec Programmable Banking

Options:

- -V, --version output the version number
- -h, --help display help for command

Commands:

- cards [options] Gets a list of your cards
- config [options] set auth credentials
- deploy [options] deploy code to card
- logs [options] fetches logs from the api
- run [options] runs the code locally
- fetch [options] fetches the saved code
- upload [options] uploads to saved code
- env [options] downloads to env to a local file
- upload-env [options] uploads env to the card
- published [options] downloads to published code to a local file
- publish [options] publishes code to the card
- simulate [options] runs the code using the online simulator
- enable [options] enables code to be used on card
- disable [options] disables code to be used on card
- currencies [options] Gets a list of supported currencies
- countries [options] Gets a list of countries
- merchants [options] Gets a list of merchants
- new [options] <string> Sets up scaffoldings for a new project
- help [command] display help for command

## Development

For development on this library, clone the repository and run the following commands:

```sh
git clone https://github.com/devinpearson/ipb.git
cd ipb
```

```sh
npm install
```

To run the CLI during development, run the following command:

```sh
node . [command]
```

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Contact

For inquiries, please open an issue.

## Acknowledgments

- [Commander](https://www.npmjs.com/package/commander)
- [Chalk](https://github.com/chalk/chalk)
- [VHS](https://github.com/charmbracelet/vhs)

## Other Projects

- [Banking API Simulator](https://github.com/devinpearson/programmable-banking-sim)
- [Random banking data generator](https://github.com/devinpearson/programmable-banking-faker)
- [Open Banking Point of Sales device](https://github.com/devinpearson/programmable-banking-pos)
- [Card Issuer](m/devinpearson/programmable-banking-card-issuer)
- [A blockly editor for card code](https://github.com/devinpearson/investec-blockly)
- [A HTTP server for using the card code emulator](https://github.com/devinpearson/investec-card-server)
- [The card code emulator package](https://github.com/devinpearson/programmable-card-code-emulator)
