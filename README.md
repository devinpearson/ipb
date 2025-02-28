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

To install the CLI, run the following commands:

```bash
npm install -g investec-ipb
```

## Configuration

You can access your client id, client secret and api key from the Investec Developer Portal.
More information on how to access your keys can be found on the [Investec Developer Community Wiki](https://investec.gitbook.io/programmable-banking-community-wiki/get-started/api-quick-start-guide/how-to-get-your-api-keys).

To configure the CLI, run the following command:

```bash
ipb config --client-id <client-id> --client-secret <client-secret> --card-id <card-id>
```

The card id is optional and can be set when calling each command. If you specify a card when calling a command, it will override the card id set in the configuration.

## Usage

There are six main commands that you can use to interact with the card:

- `cards`
- `deploy`
- `run`
- `logs`
- `enable`
- `disable`

There are also additional functions that you can use to interact with the card if you prefer handling the process yourself.

- `fetch`
- `upload`
- `env`
- `upload-env`
- `published`
- `publish`

### Card list

To get a list of your cards with card keys, card number and whether the card is enabled for card code,

run the following command for card list:

```bash
ipb cards
```

![cards command](assets/cards.gif)

### Code Deployment

for environment variables, you can set them in a `.env` file in the root of your project.
You should name your environments such as `.env.prod` or `.env.dev` and then specify the environment when running the command.
To call on these environments you will specify prod or dev as the environment.
This makes sure you dont upload the .env file for your current code project.

To deploy code to your card, run the following command:

```bash
ipb deploy -f <filename> -e <environment> -c <card-id>
```

![deploy command](assets/deploy.gif)

### Fetching Execution Logs

To fetch your execution logs and saving them to a file. This output is json format, example naming such as `executions.json` or `logs.json`, 
This function will overwrite the file if it already exists.
run the following command to save the logs to the filename specified:

```bash
ipb logs -f <filename> -c <card-id>
```

![logs command](assets/logs.gif)

### Run - Local Simulation

You can run local simulation of your code and specify the transactions details as arguments.
The amount is is in cents and the currency is the ISO 4217 currency code.

To run a transaction against your local files, run the following command:

```bash
ipb run -f main.js -e prod --amount 60000 --currency ZAR --mcc 0000 --merchant "Test Merchant" --city "Test City" --country ZA
```

![run command](assets/run.gif)

### Enable and Disable Code

To enable or disable code on your card, run the following commands:

```bash
ipb enable -c <card-id>
```

```bash
ipb disable -c <card-id>
```

![toggle command](assets/toggle.gif)

### Fetch Code

To fetch the code saved on the card, run the following command:

```bash
ipb fetch -f <filename> -c <card-id>
```

### Upload Code

To upload code to the cards saved code, run the following command:

```bash
ipb upload -f <filename> -c <card-id>
```

### Fetch Environment Variables

To fetch the environment variables saved on the card, run the following command:

```bash
ipb env -f <filename> -c <card-id>
```

### Upload Environment Variables

To upload environment variables to the card, run the following command:

```bash
ipb upload-env -f <filename> -c <card-id>
```

### Fetch Published Code

To fetch the published code saved on the card, run the following command:

```bash
ipb published -f <filename> -c <card-id>
```

### Publish Code

To publish code to the card you will need the codeId returned when saving the code using the upload command, run the following command:

```bash
ipb publish -f <filename> --code-id <code-id> -c <card-id>
```

### CLI usage

Usage: ipb [options] [command]

CLI to manage Investec Programmable Banking

Options:

- -V, --version output the version number
- -h, --help display help for command

Commands:
- cards Gets a list of your cards
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
- enable enables code to be used on card
- disable disables code to be used on card
- help [command] display help for command

## Development

For development on this library, clone the repository and run the following commands:

```bash
git clone https://github.com/devinpearson/ipb.git
cd ipb
```

```bash
npm install
```

To run the CLI during development, run the following command:

```bash
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
