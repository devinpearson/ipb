# Investec Programmable Banking CLI

Allows you to deploy your code directly to your card. It also includes a emulator to test your code locally.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)
- [Other Projects](#other-projects)

## Installation
Before installing, [download and install Node.js](https://nodejs.org/en/download/).

```bash
git clone https://github.com/devinpearson/ipb.git
cd ipb
```
```bash
npm install
```

### Usage
Commands:
  fetch-cards                            Gets a list of cards
  fetch-env [cardkey] [filename]         fetches your environmental variables
  executions [cardkey] [filename]        card execution logs
  deploy                                 deploys your code to your card
  fetch [cardkey] [filename]             fetches your saved code
  publish [cardkey] [codeid] [filename]  publishes your saved code
  fetch-published [cardkey] [filename]   fetches your published code
  run [filename]                         run your code locally
  toggle [cardkey] [enabled]             enable/disable card code
  upload [cardkey] [filename]            uploads your code to saved code
  upload-env [cardkey] [filename]        publishes your environmental variables

Options:
  -h, --help     Show help                                             [boolean]
  -v, --version  Show version number                                   [boolean]

Options:

`-e, --environment [environment]` The environment to use

`-a, --amount [amount]` The amount of the transaction

`-c, --currency [currency]` The currency of the transaction

`--mcc [mcc]` The merchant category code of the transaction

`-m, --merchant [merchant]` The merchant name of the transaction

`-i, --city [city]` The city of the transaction

`-o, --country [country]` The country of the transaction

`-h, --help` Display help for command

`-v, --version` Display the current version

To run a transaction against a template, run the following command:

```
node . main.js -e env.json --amount 60000 --currency ZAR --mcc 0000 --merchant "Test Merchant" --city "Test City" --country ZA
```
## Testing

To run the tests, use the following command:
```bash
npm test
```
## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Contact

For inquiries, please open an issue.

## Acknowledgments

- [Yargs](https://yargs.js.org/)
- [Chalk](https://github.com/chalk/chalk)

## Other Projects
- [Banking API Simulator](https://github.com/devinpearson/programmable-banking-sim)
- [Random banking data generator](https://github.com/devinpearson/programmable-banking-faker)
- [Open Banking Point of Sales device](https://github.com/devinpearson/programmable-banking-pos)
- [Card Issuer](m/devinpearson/programmable-banking-card-issuer)
- [A blockly editor for card code](https://github.com/devinpearson/investec-blockly)
- [A HTTP server for using the card code emulator](https://github.com/devinpearson/investec-card-server)
- [The card code emulator package](https://github.com/devinpearson/programmable-card-code-emulator)