# Investec Programmable Banking CLI

Allows you to deploy your code directly to your card. It also includes a emulator to test your code locally.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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
To configure the CLI, run the following command:
```bash
ipb config --client-id <client-id> --client-secret <client-secret> --card-id <card-id>
```
The card id is optional and can be set when calling each command. If you specify a card when calling a command, it will override the card id set in the configuration.

## Usage

### Card list
To get a list of your cards, run the following command:
```bash
ipb cards
```

### Code Deployment
for environment variables, you can set them in a `.env` file in the root of your project. 
You should name your environments such as `.env.prod` or `.env.dev` and then specify the environment when running the command.
To call on these environments you will specify prod or dev as the environment.
This makes sure you dont upload the .env file for your current code project.

To deploy code to your card, run the following command:
```bash
ipb deploy -f <filename> -e <environment> -c <card-id>
```

### Fetching Execution Logs
To fetch your execution logs and saving them to a file. This output is json format so `executions.json` or `logs.json`, run the following command:
```bash
ipb logs -f <filename> -c <card-id>
```
### Run - Local Simulation

You can run local simulation of your code and specify the transactions details as arguments.
The amount is is in cents and the currency is the ISO 4217 currency code.

To run a transaction against your local files, run the following command:

```
node . main.js -e prod --amount 60000 --currency ZAR --mcc 0000 --merchant "Test Merchant" --city "Test City" --country ZA
```

### CLI usage
Usage: ipb [options] [command]

CLI to manage Investec Programmable Banking

Options:
  -V, --version         output the version number
  -h, --help            display help for command

Commands:
  cards                 Gets a list of your cards
  config [options]      set auth credentials
  deploy [options]      deploy code to card
  logs [options]        fetches logs from the api
  run [options]         runs the code locally
  fetch [options]       fetches the saved code
  upload [options]      uploads to saved code
  env [options]         downloads to env to a local file
  upload-env [options]  uploads env to the card
  published [options]   downloads to published code to a local file
  publish [options]     publishes code to the card
  enable                enables code to be used on card
  disable               disables code to be used on card
  help [command]        display help for command

There is 3 main commands that you can use to interact with the card:
- deploy
- run
- logs

## Development
For development on this library, clone the repository and run the following commands:
```bash
git clone https://github.com/devinpearson/ipb.git
cd ipb
```
```bash
npm install
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