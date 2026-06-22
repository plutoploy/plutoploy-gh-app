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
    - `APP_ID`: Your GitHub App ID.
    - `PRIVATE_KEY`: Your GitHub App private key (as a single line or with `\n` characters).
    - `WEBHOOK_SECRET`: Your GitHub App webhook secret.
    - `WEBHOOK_URL`: The base URL of your PartyKit server (e.g., `https://plutoploy-gh-bot.plutoploy.partykit.dev/party`).
3.  The build command should be `npm run build` and the functions directory is `netlify/functions`.

## Webhook API

The PartyKit server exposes the following REST endpoints for interacting with the bot.

### List all repos

```
GET /api/repos
```

Returns all repos the bot has access to across all installations.

```json
{
  "repos": [
    {
      "owner": "plutoploy",
      "name": "my-app",
      "full_name": "plutoploy/my-app",
      "private": false,
      "default_branch": "main"
    }
  ]
}
```

### List repos for an owner

```
GET /api/repos/:owner
```

Returns repos for a specific user or org.

### Check if a repo is connected

```
GET /api/repos/:owner/:repo/connected
```

Returns whether the bot is installed and has access to the repo.

```json
{ "connected": true, "owner": "plutoploy", "repo": "my-app" }
```

### Inject a file into a repo

```
POST /api/repos/:owner/:repo/inject
```

Creates or updates a file in the repo.

```json
{
  "path": "deploy.sh",
  "content": "#!/bin/bash\necho 'deploying...'",
  "message": "Add deploy script",
  "branch": "main"
}
```

### Fetch raw workflow logs

```
GET /api/repos/:owner/:repo/logs/:runId
```

Fetches raw logs for a completed workflow run.

### Broadcast a webhook

```
POST /:room
```

Sends a payload to all connected clients in a room.

```json
{
  "channel": "alerts",
  "payload": { "text": "deploy succeeded" }
}
```

## Contributing

If you have suggestions for how plutoploy-gh-bot could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2026 Plutoploy
