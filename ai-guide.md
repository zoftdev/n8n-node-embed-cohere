# n8n Custom Node Development Guide

## Overview

This project is an n8n community node for **AWS Bedrock Embeddings** (Cohere, Titan, etc.).

- **Package Name:** `n8n-nodes-embeddings-aws-cohere`
- **Repository:** https://github.com/zoftdev/n8n-node-embed-cohere
- **npm:** https://www.npmjs.com/package/n8n-nodes-embeddings-aws-cohere

---

## Key Learnings

### 1. Project Structure

```
n8n_embedding/
├── nodes/
│   └── EmbeddingsAwsCohere/
│       ├── EmbeddingsAwsCohere.node.ts   # Main node implementation
│       └── bedrock.svg                    # Node icon
├── credentials/                           # Custom credentials (if any)
├── dist/                                  # Compiled output
├── package.json                           # Package config with n8n metadata
├── tsconfig.json                          # TypeScript config
├── eslint.config.mjs                      # ESLint config
└── README.md
```

### 2. package.json Requirements

```json
{
  "name": "n8n-nodes-<name>",           // Must start with n8n-nodes-
  "keywords": ["n8n-community-node-package"],  // Required keyword
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [],                   // List credential files
    "nodes": ["dist/nodes/.../Node.node.js"]  // List node files
  }
}
```

### 3. n8n-node CLI Commands

| Command | Description |
|---------|-------------|
| `npm create @n8n/node@latest` | Create new node project |
| `npm run build` | Compile TypeScript + copy assets |
| `npm run dev` | Run n8n with node (localhost:5678) |
| `npm run lint` | Check code with ESLint |
| `npm run lint --fix` | Auto-fix lint issues |
| `npm run release` | Build, tag, publish to npm |

### 4. Version Compatibility Issues

#### @langchain/aws Version Gap
- Version `0.2.x` doesn't exist
- Available: `0.1.x` → `1.x` (jumped directly)
- Solution: Use `^1.2.0` or `^0.1.15`

#### n8n-workflow Version Mismatch
- `@n8n/ai-utilities` requires `n8n-workflow@2.x`
- Error: `ISupplyDataFunctions` type incompatibility
- Solution: Update `n8n-workflow` to `^2.8.0`

#### @n8n/node-cli Version
- Old version `0.3.0` lacks `lint` and `release` commands
- Solution: Update to `^0.19.0`

### 5. Cloud vs Self-Hosted Nodes

| Feature | n8n Cloud (Verified) | Self-Hosted |
|---------|---------------------|-------------|
| Runtime dependencies | ❌ Not allowed | ✅ Allowed |
| External imports | ❌ Restricted | ✅ Allowed |
| Credential reuse | ❌ Must define own | ✅ Can use built-in |
| ESLint config | `config` (strict) | `configWithoutCloudSupport` |

**This node requires dependencies (AWS SDK, LangChain) → Self-hosted only**

### 6. ESLint Configuration

```javascript
// eslint.config.mjs - For self-hosted nodes with dependencies
import { configWithoutCloudSupport } from '@n8n/node-cli/eslint';

export default [
  ...configWithoutCloudSupport,
  {
    rules: {
      // Allow using n8n's built-in credentials (aws, etc.)
      '@n8n/community-nodes/no-credential-reuse': 'off',
    },
  },
];
```

### 7. Node Class Structure

```typescript
export class EmbeddingsAwsCohere implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Embeddings AWS Cohere',
    name: 'embeddingsAwsCohere',           // Internal name (camelCase)
    icon: 'file:bedrock.svg',              // Simple string, not object
    usableAsTool: true,                    // Required for AI nodes
    credentials: [{ name: 'aws', required: true }],
    // ...
  };

  async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
    // Implementation
  }
}
```

### 8. Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `No matching version found for @langchain/aws@^0.2.0` | Use `^1.2.0` (0.2.x doesn't exist) |
| `ISupplyDataFunctions` type error | Update `n8n-workflow` to match `@n8n/ai-utilities` version |
| `command lint not found` | Update `@n8n/node-cli` to `^0.19.0` |
| `ESLint couldn't find eslint.config` | Create `eslint.config.mjs` |
| `Import of X is not allowed` | Use `configWithoutCloudSupport` |
| `no-credential-reuse` error | Disable rule or define own credentials |
| `Light and dark icons cannot be same` | Use simple string `icon: 'file:icon.svg'` |
| `Node should have usableAsTool` | Add `usableAsTool: true` to description |

### 9. Original n8n Source Code

The original `EmbeddingsAwsBedrock` node is at:
```
https://github.com/n8n-io/n8n/blob/master/packages/@n8n/nodes-langchain/nodes/embeddings/EmbeddingsAwsBedrock/
```

**Key difference from community nodes:**
- Uses `@utils/sharedFields` (internal n8n import, not available externally)
- Uses `getConnectionHintNoticeField()` helper (must remove for community nodes)

---

## Documentation Links

### Official n8n Docs
- [Building Community Nodes](https://docs.n8n.io/integrations/community-nodes/build-community-nodes/)
- [Using n8n-node CLI](https://docs.n8n.io/integrations/creating-nodes/build/n8n-node/)
- [Submit Community Nodes](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/)
- [AWS Credentials](https://docs.n8n.io/integrations/builtin/credentials/aws/)
- [Embeddings AWS Bedrock Node](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingsawsbedrock/)

### n8n GitHub
- [n8n Repository](https://github.com/n8n-io/n8n)
- [nodes-base (built-in nodes)](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes)
- [nodes-langchain (AI nodes)](https://github.com/n8n-io/n8n/tree/master/packages/@n8n/nodes-langchain/nodes)

### npm Packages
- [@n8n/node-cli](https://www.npmjs.com/package/@n8n/node-cli)
- [@n8n/create-node](https://www.npmjs.com/package/@n8n/create-node)
- [n8n-workflow](https://www.npmjs.com/package/n8n-workflow)
- [@n8n/ai-utilities](https://www.npmjs.com/package/@n8n/ai-utilities)
- [@langchain/aws](https://www.npmjs.com/package/@langchain/aws)

### n8n Creator Portal
- [Submit for Verification](https://creators.n8n.io/nodes)

---

## Workflow: Creating a New n8n Node

1. **Initialize project**
   ```bash
   npm create @n8n/node@latest
   ```

2. **Implement node** in `nodes/<NodeName>/<NodeName>.node.ts`

3. **Add icon** as SVG in same folder

4. **Configure package.json** with n8n metadata

5. **Test locally**
   ```bash
   npm run dev
   # Visit localhost:5678
   ```

6. **Lint and build**
   ```bash
   npm run lint
   npm run build
   ```

7. **Create GitHub repo**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create <name> --public --source=. --push
   ```

8. **Publish to npm**
   ```bash
   npm login
   npm run release
   ```

9. **Install in n8n**
   - Self-hosted: `N8N_CUSTOM_EXTENSIONS=<package-name>`
   - Docker: `-e N8N_CUSTOM_EXTENSIONS=<package-name>`
   - Or install via n8n Settings → Community Nodes

---

## Dependencies Used

```json
{
  "dependencies": {
    "@aws-sdk/client-bedrock-runtime": "^3.0.0",
    "@langchain/aws": "^1.2.0",
    "@n8n/ai-utilities": "^0.2.0",
    "@smithy/node-http-handler": "^4.0.0"
  },
  "devDependencies": {
    "@n8n/node-cli": "^0.19.0",
    "n8n-workflow": "^2.8.0",
    "typescript": "~5.9.0"
  },
  "peerDependencies": {
    "n8n-workflow": "*"
  }
}
```

---

## Version Overrides (LangChain Compatibility)

```json
{
  "overrides": {
    "@langchain/core": "1.1.8",
    "langchain": "1.2.3",
    "@langchain/community": "1.0.5",
    "@langchain/classic": "1.0.5"
  }
}
```

These ensure consistent LangChain versions across all dependencies.
