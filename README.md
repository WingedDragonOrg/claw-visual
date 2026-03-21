# Claw Visual

Team status dashboard with Discord integration.

## Project Structure

```
packages/
  server/       - Backend API server
  web/          - Frontend dashboard (Vite + React)
  discord-bot/  - Discord bot for dashboard screenshots
```

## Development

```bash
bun install
bun run dev          # Start all packages
bun run dev:server   # Start server only
bun run dev:web      # Start web dashboard only
```

## Discord Bot

The Discord bot takes periodic screenshots of the dashboard and posts them to a Discord channel.

### Setup

1. Create a Discord bot at https://discord.com/developers/applications
2. Enable the **bot** scope and grant **Send Messages** + **Attach Files** permissions
3. Invite the bot to your server with the generated OAuth2 URL
4. Set environment variables:

```bash
export DISCORD_BOT_TOKEN="your-bot-token"
export DISCORD_CHANNEL_ID="target-channel-id"
# Optional:
export DASHBOARD_URL="http://localhost:5174/"   # Default
export CHROME_PATH="/usr/bin/google-chrome-stable"  # Default
```

### Run

```bash
bun run bot:dev      # Development mode (auto-reload)
bun run bot:start    # Production mode
```

### Features

- `/status` slash command: manually trigger a dashboard screenshot
- Auto-post: sends a screenshot on startup, then updates the same message every 5 minutes
- Uses puppeteer-core with local Chrome (headless)

### Requirements

- Google Chrome or Chromium installed on the host machine
- The web dashboard must be running and accessible at `DASHBOARD_URL`
