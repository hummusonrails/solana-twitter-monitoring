# Twitter Keyword Monitor and Solana Wallet Integration
![CI](https://github.com/hummusonrails/solana-twitter-monitoring/actions/workflows/ci.yml/badge.svg)

This repository provides a Node.js application that logs into a Twitter account, retrieves tweets from specific monitored accounts, searches for specified keywords, and performs email notifications and Solana wallet purchases for any matching tweets.

This project includes:

1. A main script (`main.js`) that runs the monitoring loop.
2. A set of helper functions (in `index.js`) for reading environment variables, extracting Solana token addresses, and managing the list of tweets already processed.
3. A test suite (`index.test.js`) using Jest for verifying core functionalities.

**Features**

- Periodically logs into Twitter (via `agent-twitter-client` from ai16z) to fetch the latest tweets.
- Filters tweets based on user-defined keywords (taken from environment variables).
- Extracts Solana token addresses from tweets and attempts to purchase them if matches are found.
- Sends email notifications for any keyword matches.
- Maintains a JSON file to avoid re-processing the same tweets.

## Table of contents:

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
- [Usage](#usage)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

- Node.js
- npm or yarn
- Twitter credentials (username, password, and optional email) for logging into the `agent-twitter-client`.
- A Resend API key or similar to handle email notifications in `resend.js`.
- Solana-related setup for buyToken in `solana.js` if you want to test actual token purchases.

## Environment Variables

- `SOLANA_PRIVATE_KEY`: Your Solana private key.
- `TWITTER_USERNAME`: Your Twitter username.
- `TWITTER_PASSWORD`: Your Twitter password.
- `NOTIFICATION_EMAIL`: The email address to send notifications to.
- `RESEND_API_KEY`: The API key for the Resend API.
- `RESEND_FROM_EMAIL`: The email address to send notifications from.
- `ACCOUNTS_TO_MONITOR`: A comma-separated list of Twitter accounts to monitor.
- `KEYWORDS_TO_MONITOR`: A comma-separated list of keywords to monitor.

## Installation

1. Clone the repository: [https://github.com/hummusonrails/solana-twitter-monitoring](https://github.com/hummusonrails/solana-twitter-monitoring)
2. Navigate to the project directory: `cd solana-twitter-monitoring`
3. Install dependencies: `npm install` or `yarn install`
4. Create and configure your `.env` file based on the `.env.example` file.

## Usage

1. Run the main script: `node main.js`
2. The script will:
    - Log in to Twitter using credentials from .env.
    - Load previously processed tweet IDs from `processed-tweets.json` (if present).
    - Check all specified accounts for new tweets.
    - Filter tweets by keywords.
    - Notify via email and (optionally) purchase tokens for any matching tweets.
    - Save processed tweet IDs back to `processed-tweets.json`.
    - Repeat every 5 minutes (via `setInterval` in `main.js`).

## Testing

This project uses Jest for testing. To run the tests, use the following command: `npm test` or `yarn test`.

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## License

This project is open-sourced under the MIT License - see the [LICENSE](LICENSE) file for details.
