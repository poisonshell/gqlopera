# GQL Operations - Example Usage

This document shows practical examples of how to use the GQL Operations CLI tool.

## 1. Basic Setup

### Install Dependencies
```bash
npm install
npm run build
```

### Test the CLI
```bash
node dist/cli.js --help
```

## 2. Initialize Configuration

### Create a configuration file
```bash
node dist/cli.js init
```

This creates a `gqlopera.config.json` file with default settings.

## 3. Extract Operations

### Basic usage with config file
```bash
node dist/cli.js generate
```

### Extract with custom endpoint
```bash
node dist/cli.js generate --endpoint http://localhost:4000/graphql --output graphql
```

### Extract with authentication
```bash
node dist/cli.js generate \
  --endpoint https://api.github.com/graphql \
  --headers '{"Authorization":"Bearer YOUR_GITHUB_TOKEN"}'
```

### Watch mode for development
```bash
node dist/cli.js generate --watch --verbose
```

## 4. Validate Configuration

### Validate your setup
```bash
node dist/cli.js validate
```

## 5. Example Configuration

### Basic Configuration (gqlopera.config.json)
```json
{
  "endpoint": "http://localhost:4000/graphql",
  "output": "graphql",
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN"
  },
  "excludeTypes": ["InternalType"],
  "watch": false,
  "maxDepth": 5,
  "maxFields": 50,
  "skipCircularRefs": true
}
```

### Configuration for Complex Schemas
```json
{
  "endpoint": "https://api.example.com/graphql",
  "output": "extracted-graphql",
  "headers": {
    "Authorization": "Bearer your-token-here",
    "X-API-Key": "your-api-key",
    "User-Agent": "GQLOpera"
  },
  "excludeTypes": ["PrivateType", "InternalData"],
  "watch": false,
  "maxDepth": 3,
  "maxFields": 30,
  "skipCircularRefs": true
}
```

## 6. Expected Output Structure

After running the tool, you'll get individual operation files:

```
graphql/
├── query/
│   ├── getUsers.graphql
│   ├── getUserProfile.graphql
│   ├── searchPosts.graphql
│   └── getComments.graphql
├── mutation/
│   ├── createUser.graphql
│   ├── updateProfile.graphql
│   ├── deletePost.graphql
│   └── addComment.graphql
└── subscription/
    ├── messageUpdates.graphql
    └── postNotifications.graphql
```

Each file contains a complete, executable GraphQL operation:

```graphql
# query/getUsers.graphql
query GetUsers($offset: Int!, $limit: Int!) {
  getUsers(offset: $offset, limit: $limit) {
    items {
      id
      username
      email
      profile {
        firstName
        lastName
        avatar
      }
    }
    totalCount
  }
}
```

## 7. Common Use Cases

### Extract from Local Development API
```bash
node dist/cli.js generate \
  --endpoint http://localhost:4000/graphql \
  --output my-graphql \
  --watch
```

### Extract from External GraphQL API
```bash
node dist/cli.js generate \
  --endpoint https://api.github.com/graphql \
  --headers '{"Authorization":"Bearer YOUR_TOKEN"}' \
  --output github-graphql
```


## 8. Integration with NPM Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "extract": "gqlopera generate",
    "extract:watch": "gqlopera generate --watch",
    "extract:validate": "gqlopera validate",
    "extract:init": "gqlopera init"
  }
}
```

Then use:
```bash
npm run extract        # Extract operations
npm run extract:watch  # Watch mode
npm run extract:validate  # Validate setup
```

## 9. Using with GraphQL Codegen

Perfect integration with GraphQL Code Generator:

```yaml
# codegen.yml
overwrite: true
schema: "http://localhost:4000/graphql"
documents: "./graphql/**/*.graphql"
generates:
  src/generated/graphql.tsx:
    plugins:
      - "typescript"
      - "typescript-operations"
      - "typescript-react-apollo"
    config:
      withHooks: true
      withComponent: false
      withHOC: false
```

## 10. Publishing as NPM Package

To make this installable globally:

1. Update `package.json` with your details
2. Build the project: `npm run build`
3. Publish: `npm publish`
4. Install globally: `npm install -g gqlopera`
5. Use anywhere: `gqlopera generate`

## 11. Troubleshooting

### Common Issues

**Permission Denied**
```bash
chmod +x dist/cli.js
```

**Module Not Found**
```bash
npm install
npm run build
```

**Authentication Errors**
- Check your headers format (must be valid JSON)
- Verify your tokens are valid
- Ensure endpoint URL is correct

**Schema Introspection Disabled**
- GraphQL introspection must be enabled on the target endpoint
- This is usually enabled in development but disabled in production

**Empty Output**
- Check if your GraphQL API has any operations defined
- Verify the endpoint is accessible
- Run with `--verbose` flag for detailed logging

**Operations Too Large/Complex**
- Reduce `maxDepth` for simpler operations (try 3 instead of 5)
- Reduce `maxFields` to limit field count per type
- Use `excludeTypes` to skip complex types
- Enable `skipCircularRefs` to see where circular references are handled

**Performance Issues**
- Lower `maxDepth` and `maxFields` for faster generation
- Use `excludeTypes` to skip heavy types
- Consider targeting specific operations instead of full schema extraction 