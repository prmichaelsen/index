# Weaviate Collection Strategy

**Concept**: Single vs multiple collections for different document types  
**Created**: 2026-02-11  
**Status**: Design Analysis

---

## The Question

Do we need separate Weaviate collections for:
- Memories (user content)
- Templates (structure definitions)
- Audit logs (system events)
- Relationships (memory connections)

Or can we use a single collection with type discrimination?

---

## Analysis

### Option 1: Multiple Collections (Current Plan)

```
Weaviate Collections:
├── Memory_{user_id}        # User memories
├── Template_system         # Default templates
├── Template_{user_id}      # User templates
├── Audit_{user_id}         # Audit logs
└── Relationship_{user_id}  # Relationships
```

**Pros**:
- ✅ Clear separation of concerns
- ✅ Different schemas per collection
- ✅ Optimized indexes per type
- ✅ Easier to manage collection-specific settings
- ✅ Better performance (smaller collections)
- ✅ Simpler queries (no type filtering needed)

**Cons**:
- ❌ More collections to manage
- ❌ Weaviate collection limits (check pricing tier)
- ❌ More complex cross-type queries
- ❌ Duplication of user_id collections

---

### Option 2: Single Collection Per User

```
Weaviate Collections:
└── User_{user_id}          # All user data
    ├── type: "memory"
    ├── type: "template"
    ├── type: "audit"
    └── type: "relationship"
```

**Pros**:
- ✅ Fewer collections (one per user)
- ✅ Easier cross-type queries
- ✅ Single collection management
- ✅ No collection limit concerns

**Cons**:
- ❌ Mixed schemas in one collection
- ❌ Less optimized indexes
- ❌ Slower queries (need type filtering)
- ❌ Harder to manage different retention policies
- ❌ Mixing concerns (memories with audit logs)

---

### Option 3: Hybrid - Separate by Purpose

```
Weaviate Collections:
├── Memory_{user_id}        # User memories (searchable content)
├── Template_system         # System templates (shared resource)
└── System_{user_id}        # System data (audit, history, etc.)
    ├── type: "audit"
    ├── type: "history"
    └── type: "action"
```

**Pros**:
- ✅ Separates user content from system data
- ✅ Optimized for different use cases
- ✅ Fewer collections than Option 1
- ✅ Clear purpose per collection

**Cons**:
- ❌ Still multiple collections
- ❌ Relationships unclear (separate or in Memory?)

---

## Recommendation: Hybrid with Clear Separation

### Proposed Collection Structure

```
Weaviate Collections:

1. Memory_{user_id}
   - User memories (main content)
   - Searchable, frequently accessed
   - Optimized for semantic search
   - Includes: content, context, location, weight, trust
   
2. Relationship_{user_id}
   - Memory relationships
   - Separate because different schema
   - Optimized for graph queries
   - Includes: memory_ids, type, observation, strength
   
3. Template_system
   - Default templates (shared across all users)
   - Immutable, curated by platform
   - Optimized for template matching
   
4. Template_{user_id}
   - User-created templates
   - Private or shared
   - Optimized for template matching
   
5. Audit_{user_id} (OPTIONAL)
   - Audit logs, action logs, history
   - Separate retention policies
   - Less frequently searched
   - Can be disabled or sampled
```

### Rationale

**Separate Collections For**:

1. **Memories** - Core user content, frequently searched
2. **Relationships** - Different schema, graph structure
3. **Templates** - Shared resource (system) + user-specific
4. **Audit** - Different retention, less frequently accessed

**Why Not Single Collection**:
- Memories and audit logs have very different access patterns
- Templates need to be shared across users (Template_system)
- Relationships have fundamentally different schema
- Performance: Smaller collections = faster queries

---

## Schema Comparison

### Memory Schema
```yaml
Memory:
  content: text (LARGE, vectorized)
  title: string
  type: string
  weight: float
  trust: float
  location: object
  context: object
  relationships: array (IDs)
  # Optimized for: Semantic search, content retrieval
```

### Relationship Schema
```yaml
Relationship:
  memory_ids: array (2...N IDs)
  type: string
  observation: text (SMALL)
  strength: float
  confidence: float
  context: object
  # Optimized for: Graph traversal, relationship queries
```

### Template Schema
```yaml
Template:
  template_name: string
  fields: array (field definitions)
  trigger_keywords: array
  trigger_context: object
  # Optimized for: Template matching, field validation
```

### Audit Schema
```yaml
Audit:
  event_type: string
  action: string
  target_id: string
  timestamp: datetime
  # Optimized for: Time-series queries, compliance
```

**Conclusion**: These are fundamentally different data types with different schemas and access patterns. Separate collections make sense.

---

## Collection Limit Considerations

### Weaviate Cloud Limits

**Typical Limits** (varies by tier):
- Free tier: ~10 collections
- Standard tier: ~100 collections
- Enterprise: ~1000+ collections

### Our Usage

**Per User** (assuming 1000 users):
- Memory_{user_id}: 1000 collections
- Relationship_{user_id}: 1000 collections
- Template_{user_id}: 1000 collections
- Audit_{user_id}: 1000 collections (optional)
- **Total**: 3000-4000 collections

**Shared**:
- Template_system: 1 collection

**Potential Issue**: May exceed collection limits on lower tiers

### Mitigation Strategies

#### Strategy A: Single Collection with Type Filter (If Limits Hit)

```
Weaviate Collections:
└── User_{user_id}
    ├── doc_type: "memory"
    ├── doc_type: "relationship"
    ├── doc_type: "template"
    └── doc_type: "audit"
```

**Trade-off**: Slower queries, but works within limits

#### Strategy B: Selective Collections

```
Weaviate Collections:
├── Memory_{user_id}        # Always separate (most important)
├── Template_system         # Shared (always separate)
└── Meta_{user_id}          # Combined: relationships, audit, templates
    ├── doc_type: "relationship"
    ├── doc_type: "audit"
    └── doc_type: "template"
```

**Trade-off**: Memories optimized, others combined

#### Strategy C: Lazy Collection Creation

```typescript
// Only create collections when needed
async function ensureCollection(user_id: string, type: string): Promise<void> {
  const collectionName = `${type}_${user_id}`;
  
  const exists = await weaviateClient.collections.exists(collectionName);
  
  if (!exists) {
    await weaviateClient.collections.create({
      name: collectionName,
      // ... schema
    });
  }
}

// Don't create Audit_{user_id} unless user enables audit logging
// Don't create Template_{user_id} unless user creates custom template
```

---

## Recommendation

### Phase 1 (MVP): Minimal Collections

```
Weaviate Collections:
├── Memory_{user_id}        # User memories
├── Template_system         # Default templates only
└── (no user templates yet)
└── (no separate relationships yet - store in memory)
└── (no audit logs yet)
```

**Rationale**: Start simple, add collections as needed

### Phase 2: Add Relationships

```
Weaviate Collections:
├── Memory_{user_id}        # User memories
├── Relationship_{user_id}  # Memory relationships
└── Template_system         # Default templates
```

### Phase 3: Add User Templates & Audit

```
Weaviate Collections:
├── Memory_{user_id}        # User memories
├── Relationship_{user_id}  # Memory relationships
├── Template_system         # Default templates
├── Template_{user_id}      # User templates (lazy create)
└── Audit_{user_id}         # Audit logs (lazy create, optional)
```

---

## Alternative: Relationships in Memory Collection

### Store Relationships as Special Memories

```yaml
Memory_{user_id}:
  # Regular memory
  - id: mem_123
    doc_type: "memory"
    content: "Camping trip to Yosemite"
    
  # Relationship stored as special memory
  - id: rel_456
    doc_type: "relationship"
    memory_ids: [mem_123, mem_789]
    relationship_type: "inspired_by"
    observation: "Yosemite trip inspired planning for Sequoia"
```

**Benefits**:
- ✅ Fewer collections
- ✅ Relationships searchable with memories
- ✅ Single collection per user

**Drawbacks**:
- ❌ Mixed document types
- ❌ Need type filtering on every query
- ❌ Less optimized

---

## Final Recommendation

**Start with Option 1 (Multiple Collections) but with lazy creation**:

1. **Always Create**:
   - `Memory_{user_id}` - Core functionality
   - `Template_system` - Shared default templates

2. **Create On Demand**:
   - `Relationship_{user_id}` - When first relationship created
   - `Template_{user_id}` - When user creates custom template
   - `Audit_{user_id}` - If user enables audit logging

3. **Monitor Collection Count**:
   - Track total collections
   - If approaching limits, consolidate into `User_{user_id}` with type field

**This gives us flexibility to optimize later while starting with clean separation.**

---

**Status**: Design Recommendation  
**Strategy**: Multiple collections with lazy creation  
**Fallback**: Single collection with type discrimination if limits hit  
**Key**: Monitor collection count and adjust as needed
