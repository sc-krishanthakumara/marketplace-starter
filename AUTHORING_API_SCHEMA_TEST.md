# Testing Authoring GraphQL API Schema

## Current Status

✅ Authentication works (Bearer token)  
✅ API responding  
❌ Schema doesn't match Edge/Preview schema  

---

## Let's Find the Correct Schema

### Test in Authoring GraphQL IDE

1. Open: Click "Launch IDE" under "Authoring GraphQL IDE" in XM Cloud Deploy
2. Run this introspection query to discover the schema:

```graphql
{
  __schema {
    queryType {
      fields {
        name
        description
        args {
          name
          type {
            name
            kind
          }
        }
      }
    }
  }
}
```

This will show all available query fields.

### Then Test Item Lookup

Try these queries ONE BY ONE and tell me which one works:

**Query 1: Simple item by path**
```graphql
{
  item(path: "/sitecore/content/sync/sync/Home/Data/HeroST/HeroST 1") {
    id
    name
  }
}
```

**Query 2: Item with language**
```graphql
{
  item(path: "/sitecore/content/sync/sync/Home/Data/HeroST/HeroST 1", language: "en") {
    id
    name
  }
}
```

**Query 3: Item by ID**
```graphql
{
  item(itemId: "7943a20a-669d-4921-81ee-f4ec7f2e78a3") {
    id
    name
  }
}
```

**Query 4: Search**
```graphql
{
  search(keyword: "HeroST 1") {
    total
    results {
      id
      name
    }
  }
}
```

---

## What to Do

1. Click **"Launch IDE"** for Authoring GraphQL IDE
2. Try the introspection query first
3. Copy the result and paste it here
4. Or try each test query and tell me which one works!

This will help me fix the schema properly! 🎯
