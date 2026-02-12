# n8n-nodes-embeddings-aws-cohere

Custom n8n node: **Embeddings AWS Cohere** (`embeddingsAwsCohere`)

AWS Bedrock embeddings for n8n AI workflows. Supports Cohere, Titan, and other Bedrock embedding models.

## Install in n8n

### From local folder

```bash
# In n8n data directory, or set N8N_CUSTOM_EXTENSIONS
npm install /path/to/n8n_embedding
```

### From npm (after publishing)

```bash
npm install n8n-nodes-embeddings-aws-cohere
```

### n8n configuration

Add to n8n:

- **Self-hosted**: `N8N_CUSTOM_EXTENSIONS=n8n-nodes-embeddings-aws-cohere`
- **Docker**: `-e N8N_CUSTOM_EXTENSIONS=n8n-nodes-embeddings-aws-cohere`

## Development

```bash
npm install
npm run build    # Build for production
npm run dev     # Dev mode with n8n
```

## Credentials

Uses the built-in **AWS** credential type (Access Key ID, Secret Access Key, Region).

## Publish to npm

```bash
# 1. Update package.json: replace YOUR_USERNAME with your GitHub username
# 2. Create repo on GitHub and push
npm login
npm run build
npm publish
```

## Submit to n8n Community

After publishing, submit at: https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/

## Source

Based on n8n's Embeddings AWS Bedrock node from [n8n-io/n8n](https://github.com/n8n-io/n8n).
