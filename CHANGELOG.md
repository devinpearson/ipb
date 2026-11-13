<!-- markdownlint-configure-file { "MD024": { "siblings_only": true } } -->

# Changelog

All notable changes to `investec-ipb` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Read-only mode** for AI agents and scripts: `IPB_READ_ONLY` or
  `ipb config --read-only` blocks `pay`, `transfer`, `deploy`, `upload`,
  `upload-env`, `publish`, `enable` and `disable` with `E4022` (exit 7).
  `--dry-run` still works. Turning it off needs an interactive terminal and a
  confirmation ([#50]).
- **JSON errors**: with `--json` or `IPB_JSON_ERRORS=1`, failures print a single
  `{"error":{...}}` object on stderr, including Commander usage errors ([#50]).
- **OS keychain storage** with `ipb config --keychain` (macOS Keychain or Linux
  libsecret); `--no-keychain` moves secrets back to the credentials file ([#52]).
- `ipb config delete` (with `--all` and `--yes`) to remove stored credentials ([#51]).
- `--search` on `currencies`, `countries` and `merchants` ([#51]).
- `IPB_TX_AMOUNT`, `IPB_TX_CURRENCY`, `IPB_TX_MCC`, `IPB_TX_MERCHANT`,
  `IPB_TX_CITY` and `IPB_TX_COUNTRY` set the defaults for `ipb run` and
  `ipb simulate` ([#52]).
- `transactions --from`, `--to` (YYYY-MM-DD) and `--type` filters ([#49]).
- `pay` and `transfer --dry-run` to check names and show the summary without
  sending; `--json` prints the bank response on stdout ([#49]).
- `ipb config` prompts for the client ID, secret and API key (masked) when run in
  a terminal with no options, and accepts `-` on any option to read from stdin ([#49]).
- Release binaries carry signed build provenance
  (`gh attestation verify <file> --repo devinpearson/ipb`) ([#52]).
- The release workflow pushes the generated Homebrew formula to the
  `devinpearson/homebrew-ipb` tap on each tag ([#66]).
- Knip (dead code) and Stryker (mutation testing) in CI ([#49]).

### Changed

- `--spinner` is replaced by the conventional `--no-spinner`; `-s` still works as
  a deprecated alias ([#49]).
- Only `IPB_MOCK_APIS` enables the in-process mock APIs. Previously any non-empty
  `DEBUG` (e.g. `DEBUG=express:*`) silently switched to mocks ([#67]).
- Passing `--profile` together with `--credentials-file` is now an `E4013` error
  instead of silently ignoring the file ([#67]).
- `ipb deploy` saves the code first, then uploads the env and publishes; if
  publishing fails the previous env is restored ([#51]).
- Card keys must be positive whole numbers written as digits (`0x10`, `1e3`,
  `1.5` and `-4` are rejected) ([#51]).
- `pay` and `transfer` fail (exit 2) instead of silently cancelling when there is
  no terminal and no `--yes` ([#49]).
- `~/.ipb`, history, credential and output files are written owner-only
  (`600`/`700`) ([#49]).
- Upgraded dependencies: openai 4 → 7, zod 3 → 4, js-yaml 4 → 5,
  @inquirer/prompts 7 → 8, investec-pb-api 0.3.13, investec-card-api 0.3.0,
  commander 15.1, undici 8.12.4 and others ([#53], [#58], [#64], [#65], [#68]–[#73]).
- GitHub Actions are pinned to commit SHAs; npm publish verifies dependency
  signatures and runs the tests and smoke test first ([#52]).

### Fixed

- `pay` reported success without checking the bank's response. Unconfirmed
  payments now exit non-zero with `E4021`, payments awaiting approval in the
  Investec app show a warning, and unknown account or beneficiary IDs are
  refused before any money moves ([#49]).
- Secrets passed as flags (e.g. `--client-secret`) were stored in
  `~/.ipb/history.json`. Values are now fully masked and existing entries are
  re-masked on the next write ([#52]).
- Amounts such as `0x10`, `0b11` and `1e3` were accepted and misread; impossible
  dates such as `2026-02-31` were accepted; account IDs could contain URL
  characters ([#49]).
- Errors containing `429` (e.g. an amount like R14290) were treated as rate
  limiting and the request — possibly a payment — was retried ([#49]).
- 401 and 429 responses with a plain-text body were not recognised, so they had
  no credentials tip and 429s were not retried ([#64]).
- `ipb new` crashed in the standalone binaries and the templates were not
  packaged ([#52]).
- Templates from `ipb new` defined `_beforeTransaction` etc., so the card never
  called them ([#67]).
- `ipb config --host` claimed to save the host but did not ([#67]).
- `ipb config --profile` overwrote a profile it could not read ([#52]).
- Error output (blank lines, verbose rate-limit details) leaked to stdout and
  could corrupt `--json` output ([#49]).

### Documentation

- README accuracy pass, regenerated command docs, and documented error codes
  `E4015`–`E4018` ([#67]).

## [0.10.1] - 2026-08-05

### Fixed

- `ipb mau` commands handle singleton objects, responses without a `data`
  wrapper, and balances nested under `accounts.balance` ([#48]).

## [0.10.0] - 2026-08-05

### Added

- `ipb mau` commands for Mauritius (MAU) Open Banking, with separately
  namespaced credentials, mock API support and shell completions ([#47]).

### Fixed

- Snap Store credentials and the `investec-ipb` snap name ([#46]).
- Windows binary rename step in the release workflow ([#45]).

## [0.9.3] - 2026-08-03

### Fixed

- esbuild bundling on Windows release runners ([#44]).
- Snap packaging with current snapcraft ([#44]).

## [0.9.2] - 2026-08-03

### Changed

- npm releases use trusted publishing ([#43]).

## [0.9.1] - 2026-08-03

### Changed

- GitHub Actions run on the Node 24 runtime ([#42]).

## [0.9.0] - 2026-08-03

### Added

- `ipb simulate` runs card code against Investec's online simulator.
- `--credentials-file` and inline credential options on every command.
- Reference functions documented in the README.
- Portable `ipb` agent skill for using the CLI from AI agents ([#37]).
- `CONTRIBUTING.md`; README restructured ([#38]).

### Changed

- Credential property casing made consistent.
- The CLI version is read from `package.json` ([#36]).

### Fixed

- Rate-limit failures exit with code 5 instead of as validation errors ([#36]).
- `ipb disable` output.

## [0.8.3] - 2025-06-26

### Changed

- README, styling and demo tapes updated.

## [0.8.1] - 2025-06-09

### Added

- `ipb pay`, `ipb transfer` and `ipb beneficiaries` commands, also available as
  tools in `ipb bank` ([#34]).
- Table views for command output.
- Support for corporate networks with TLS-intercepting proxies
  (`REJECT_UNAUTHORIZED`).

## [0.8.0] - 2025-04-24

### Added

- AI-assisted card code generation (`ipb ai`) ([#32]).
- Mock data for the APIs ([#31]).

## [0.7.x] - 2025-03

### Added

- Output format options and updated demo GIFs.
- Community disclaimer and code of conduct.

## [0.5.x] - 2025-02

### Added

- `toggle` command and legacy commands.
- VHS tapes for generating README GIFs.

### Changed

- CLI rewritten on Commander for better TypeScript support.
- `executions` renamed to `logs`.

## [0.1.0] - 2025-01-29

- Initial release.

[Unreleased]: https://github.com/devinpearson/ipb/compare/v0.10.1...HEAD
[0.10.1]: https://github.com/devinpearson/ipb/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/devinpearson/ipb/compare/v0.9.3...v0.10.0
[0.9.3]: https://github.com/devinpearson/ipb/compare/v0.9.2...v0.9.3
[0.9.2]: https://github.com/devinpearson/ipb/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/devinpearson/ipb/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/devinpearson/ipb/compare/v0.8.3...v0.9.0
[0.8.3]: https://github.com/devinpearson/ipb/compare/v0.8.1...v0.8.3
[0.8.1]: https://github.com/devinpearson/ipb/releases/tag/v0.8.1

[#31]: https://github.com/devinpearson/ipb/pull/31
[#32]: https://github.com/devinpearson/ipb/pull/32
[#34]: https://github.com/devinpearson/ipb/pull/34
[#36]: https://github.com/devinpearson/ipb/pull/36
[#37]: https://github.com/devinpearson/ipb/pull/37
[#38]: https://github.com/devinpearson/ipb/pull/38
[#42]: https://github.com/devinpearson/ipb/pull/42
[#43]: https://github.com/devinpearson/ipb/pull/43
[#44]: https://github.com/devinpearson/ipb/pull/44
[#45]: https://github.com/devinpearson/ipb/pull/45
[#46]: https://github.com/devinpearson/ipb/pull/46
[#47]: https://github.com/devinpearson/ipb/pull/47
[#48]: https://github.com/devinpearson/ipb/pull/48
[#49]: https://github.com/devinpearson/ipb/pull/49
[#50]: https://github.com/devinpearson/ipb/pull/50
[#51]: https://github.com/devinpearson/ipb/pull/51
[#52]: https://github.com/devinpearson/ipb/pull/52
[#53]: https://github.com/devinpearson/ipb/pull/53
[#58]: https://github.com/devinpearson/ipb/pull/58
[#64]: https://github.com/devinpearson/ipb/pull/64
[#65]: https://github.com/devinpearson/ipb/pull/65
[#66]: https://github.com/devinpearson/ipb/pull/66
[#67]: https://github.com/devinpearson/ipb/pull/67
[#68]: https://github.com/devinpearson/ipb/pull/68
[#73]: https://github.com/devinpearson/ipb/pull/73
