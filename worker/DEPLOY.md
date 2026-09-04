# Worker Deployment

The Foresight Shop worker is deployed to Cloudflare Workers with a Durable Object.

## Prerequisites

- Cloudflare account with Workers and Durable Objects enabled
- `wrangler` CLI installed (already in `worker/package.json`)
- Worker deployed at `https://foresight-shop.marvelus.workers.dev`

## Deploy Command

```bash
cd /workspace
npx wrangler deploy
```

Or if wrangler is installed globally:

```bash
wrangler deploy
```

## Configuration

See `wrangler.toml` in the repo root:
- Worker name: `foresight-shop`
- Main entry: `worker/index.js`
- Durable Object: `Shelf` class
- Route: `https://foresight-shop.marvelus.workers.dev/*`

## MCP Endpoints

After deployment, the following endpoints are live:

- `GET /state` — shared shop state (legacy REST)
- `GET /instructions` — agent prompt (legacy REST)
- `POST /buy` — buy endpoint (legacy REST)
- `POST /reset` — reset demo (legacy REST, gated)
- `POST /mcp` — Remote MCP JSON-RPC endpoint (NEW)
- `GET /.well-known/mcp.json` — MCP discovery (NEW)

## Testing MCP Locally

If credentials are missing, document the deploy command for later:

```bash
# Install wrangler if needed
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
wrangler deploy
```

## First-Time Setup

If this is the first deployment:

1. Create a Cloudflare account
2. Enable Workers and Durable Objects
3. Run `wrangler login` and follow the OAuth flow
4. Run `wrangler deploy`

The worker will be available at `https://foresight-shop.marvelus.workers.dev`.
