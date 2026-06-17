# plutoploy-gh-bot

for selfhosting this bot generate secrets with

  ```bash
    openssl rand -hex 64
  ```

```bash
curl -X POST https://appname.test.partykit.dev/party/my-room-name \
            -H "Content-Type: application/json" \
            -d '{"channel":"alerts","payload":{"text":"success ${}"}}'
```

> A GitHub App built with [Probot](https://github.com/probot/probot) that plutoploy a easier way to devops


## Setup

```sh
# Install dependencies
npm install

# Run the bot
npm start
```

## Docker

```sh
# 1. Build container
docker build -t plutoploy-gh-bot .

# 2. Start container
docker run -e APP_ID=<app-id> -e PRIVATE_KEY=<pem-value> plutoploy-gh-bot
```

## Netlify

This bot can be deployed as a Netlify Function.

### Deployment

1.  Connect your repository to Netlify.
2.  Configure the following environment variables in the Netlify UI:
    *   `APP_ID`: Your GitHub App ID.
    *   `PRIVATE_KEY`: Your GitHub App private key (as a single line or with `\n` characters).
    *   `WEBHOOK_SECRET`: Your GitHub App webhook secret.
    *   `WEBHOOK_URL`: The base URL of your PartyKit server (e.g., `https://plutoploy-gh-bot.plutoploy.partykit.dev/party`).
3.  The build command should be `npm run build` and the functions directory is `netlify/functions`.


## Contributing

If you have suggestions for how plutoploy-gh-bot could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2026 Plutoploy
