# GQLOpera

A fast, focused CLI tool that extracts individual GraphQL operation files from any GraphQL API. Perfect for feeding into GraphQL Codegen or other GraphQL tooling.

## ✨ What it does

- **Introspects** your GraphQL API
- **Extracts** all queries, mutations, and subscriptions  
- **Generates** individual `.graphql` files with complete selection sets
- **Organizes** them in `query/`, `mutation/`, and `subscription/` folders
- **Ready for Codegen**: Generated files work seamlessly with GraphQL Code Generator 

## 🚀 Quick Start

```bash
# Extract operations from your GraphQL API
npx gqlopera generate --endpoint http://localhost:4000/graphql --output ./graphql

# Or install globally
npm install -g gqlopera
gqlopera generate --endpoint https://api.example.com/graphql --output ./my-graphql
```

## 🔧 Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoint` | `string` | *required* | GraphQL API endpoint URL |
| `output` | `string` | `"graphql"` | Output directory path |
| `headers` | `object` | `{}` | HTTP headers for authentication |
| `excludeTypes` | `string[]` | `[]` | Type names to exclude from generation |
| `watch` | `boolean` | `false` | Watch for schema changes |
| `maxDepth` | `number` | `5` | Maximum nesting depth for selection sets (1-10) |
| `maxFields` | `number` | `50` | Maximum fields per type (5-100) |
| `circularRefs` | `string` | `"skip"` | Circular reference handling: "skip", "silent", or "allow" |
| `shallowMode` | `boolean` | `false` | Enable shallow mode (maxDepth=1) |
| `includeFields` | `string[]` | `[]` | Only include specific fields |
| `excludeFields` | `string[]` | `[]` | Exclude specific fields |
| `fieldDepthMap` | `object` | `{}` | Custom depth per type |
| `circularRefDepth` | `number` | `1` | Depth limit for circular references |
| `circularRefTypes` | `object` | `{}` | Custom depth per circular type |

## 🎯 Shallow Data Options

For users who want minimal, focused data extraction (1-2 levels deep), GQLOpera provides several options:

### Quick Shallow Mode
```bash
# Generate only 1 level deep
gqlopera generate --endpoint http://localhost:4000/graphql --shallow

# Or via config
{
  "shallowMode": true
}
```

### Custom Depth Control
```bash
# Generate 2 levels deep
gqlopera generate --endpoint http://localhost:4000/graphql --max-depth 2

# Or via config
{
  "maxDepth": 2
}
```

### Field Selection
```bash
# Only include specific fields
gqlopera generate --endpoint http://localhost:4000/graphql --include-fields "id,name,title,email"

# Or via config
{
  "includeFields": ["id", "name", "title", "email"]
}
```

### Type-Specific Depth
```json
{
  "fieldDepthMap": {
    "User": 2,      // User type: 2 levels deep
    "Post": 1,      // Post type: 1 level deep  
    "Comment": 0    // Comment type: no nesting
  }
}
```

### Example Output (Shallow Mode)
```graphql
# With maxDepth: 1
query GetUser($id: ID!) {
  getUser(id: $id) {
    id              # Level 1 - scalar
    name            # Level 1 - scalar
    email           # Level 1 - scalar
    profile         # Level 1 - object (no nesting)
    posts           # Level 1 - array (no nesting)
  }
}

# With includeFields: ["id", "name"]
query GetUser($id: ID!) {
  getUser(id: $id) {
    id
    name
  }
}
```

## 🎯 Circular Reference Depth Control

For schemas with circular references (like User ↔ Post), GQLOpera provides options to extract limited data instead of completely skipping:

### Basic Circular Reference Control
```bash
# Allow circular refs with 2 levels of depth
gqlopera generate --endpoint http://localhost:4000/graphql --circular-refs allow --circular-ref-depth 2

# Or via config
{
  "circularRefs": "allow",
  "circularRefDepth": 2
}
```

### Type-Specific Circular Reference Depth
```json
{
  "circularRefs": "allow",
  "circularRefTypes": {
    "User": 2,      // User circular refs: 2 levels deep
    "Post": 1,      // Post circular refs: 1 level deep
    "Comment": 0    // Comment circular refs: no nesting
  }
}
```

### Example Output with Circular Reference Depth
```graphql
# Before: Circular ref completely skipped
query GetUser($id: ID!) {
  getUser(id: $id) {
    id
    name
    posts {
      id
      title
      author # Circular reference to User skipped
    }
  }
}

# After: Circular ref with limited depth
query GetUser($id: ID!) {
  getUser(id: $id) {
    id
    name
    posts {
      id
      title
      content
      author {
        id        # Circular ref allowed with depth limit
        name      # Only scalar fields included
        email     # No further nesting
      }
    }
  }
}
```

### When to Use Circular Reference Depth
- **User ↔ Post relationships**: Get basic user info in posts
- **Organization ↔ Department**: Show department hierarchy
- **Category ↔ Product**: Display category info in products
- **Any bidirectional relationships**: Extract useful data without infinite loops

## 🎯 Output Structure

```
graphql/
├── query/
│   ├── getUsers.graphql
│   ├── getProfile.graphql
│   └── searchPosts.graphql
├── mutation/
│   ├── createUser.graphql
│   ├── updateProfile.graphql
│   └── deletePost.graphql
└── subscription/
    └── messageUpdates.graphql
```

## 📄 Generated Files

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

## ⚙️ Configuration

Create a `gqlopera.config.json` file:

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
  "circularRefs": "skip"
}
```

Or generate one interactively:

```bash
gqlopera init
```

## 🔄 Handling Complex Schemas

GQLOpera intelligently handles complex GraphQL schemas with circular reference detection and depth management:

### 🌀 Circular Reference Detection

GraphQL schemas often contain circular references where types reference each other, creating potential infinite loops. GQL Operations uses tracking to detect and handle these safely:


**Detection Strategy:**
```graphql
# Before: Infinite loop potential
type User {
  id: ID!
  posts: [Post!]!
}

type Post {
  id: ID!
  author: User!  # Circular reference back to User
}

# After: Smart handling with comments
query GetUser($id: ID!) {
  getUser(id: $id) {
    id
    name
    email
    posts {
      id
      title
      content
      author # Circular reference to User skipped
    }
  }
}
```

### 📊 Multi-Level Depth Control

**Depth Tracking Algorithm:**
- **Level 0**: Root operation field
- **Level 1**: Direct properties of root
- **Level 2**: Nested objects within properties
- **Level 3+**: Deep nesting controlled by `maxDepth`

**Example with maxDepth: 5:**
```graphql
query GetOrganization($id: ID!) {
  getOrganization(id: $id) {           # Level 0
    id                                 # Level 1 - scalar
    name                               # Level 1 - scalar
    departments {                      # Level 1 - object
      id                               # Level 2 - scalar
      name                             # Level 2 - scalar
      manager {                        # Level 2 - object  
        id                             # Level 3 - scalar
        profile {                      # Level 3 - object
          settings {                   # Level 4 - object
            theme                      # Level 5 - scalar
            preferences # Max depth (5) reached
          }
        }
      }
    }
  }
}
```

### 🎛️ Advanced Configuration Options

**Granular Control:**
```json
{
  "maxDepth": 7,           // Allow deeper nesting for complex schemas
  "maxFields": 25,         // Balance between completeness and readability
  "circularRefs": "skip"   // Have control here
}
```


### 🚦 Field Limiting

The `maxFields` setting prevents operations from becoming too large by limiting how many fields are included per GraphQL type.

**⚠️ Important: No Smart Prioritization**
- Takes the **first N fields** in schema definition order
- **No** prioritization of "important" fields like `id` or `name`
- **No** filtering of "less important" fields like timestamps
- Field order depends entirely on how the GraphQL server defines its schema

**Example with `maxFields: 5`:**

```graphql
# Original User type has 12 fields
query GetUser($id: ID!) {
  user(id: $id) {
    id              # Field 1 ✅ Included
    email           # Field 2 ✅ Included  
    firstName       # Field 3 ✅ Included
    lastName        # Field 4 ✅ Included
    avatar          # Field 5 ✅ Included
    # ... 7 more fields (limited by maxFields: 5)
    
    # ❌ These fields were dropped:
    # createdAt, updatedAt, profile, preferences, 
    # organization, permissions, lastLoginAt
  }
}
```

**When Field Limiting Activates:**
- User type has 50+ fields → Only first 50 included
- Product type has 100+ fields → Only first 100 included  
- Automatically adds comment showing how many fields were omitted

**Better Alternatives:**
- Use `excludeTypes` to skip problematic types entirely
- Increase `maxFields` if you need more fields
- Use `maxDepth` to control nesting instead of field count

**Example Output:**
```graphql
query GetProduct($id: ID!) {
  getProduct(id: $id) {
    id                    # Always included - primary key
    name                  # Essential scalar fields
    price
    description
    category {
      id                  # Simple reference
      name
      parent # Circular reference to Category skipped
    }
    reviews {
      # ... 15 more fields (limited by maxFields: 20)
    }
  }
}
```

```

## 🛠️ CLI Commands

### Generate Operations
```bash
gqlopera generate [options]

Options:
  -e, --endpoint <url>     GraphQL endpoint URL
  -o, --output <path>      Output directory (default: "graphql") 
  -c, --config <path>      Config file path (default: "gqlopera.config.json")
  -h, --headers <json>     HTTP headers as JSON string
  --watch                  Watch for schema changes and regenerate
  --verbose                Enable verbose logging
  --max-depth <number>     Maximum depth for field expansion (default: 5)
  --max-fields <number>    Maximum fields per type (default: 50)
  --shallow                Enable shallow mode (maxDepth=1)
  --include-fields <fields> Comma-separated list of fields to include
  --exclude-fields <fields> Comma-separated list of fields to exclude
  --circular-ref-depth <number> Depth limit for circular references (default: 1)
  --circular-refs <mode>   Circular reference handling: skip, silent, or allow (default: skip)
```

### Initialize Config
```bash
gqlopera init
```

### Validate Endpoint
```bash
gqlopera validate
```

## 🔗 Perfect for GraphQL Codegen

Use with [GraphQL Code Generator](https://the-guild.dev/graphql/codegen) to generate types and hooks:

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
```

## 🚀 Use Cases

- **Ready for Codegen**: Generated document files work directly with GraphQL Code Generator 
- **Testing**: Use individual operations in your tests
- **Documentation**: Clean, organized operation files
- **Migration**: Extract operations from existing APIs
- **Development**: Better organization of GraphQL operations


## 📋 Requirements

- Node.js 16+
- Access to a GraphQL endpoint (with introspection enabled)

## 📄 License

GPL-2.0

---

**Extract → Organize → Generate** 🚀 