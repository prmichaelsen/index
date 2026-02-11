# Template Storage Strategy

**Concept**: Hybrid storage for user templates and default template library  
**Created**: 2026-02-11  
**Status**: Design Specification

---

## Overview

Templates need to be stored in a way that supports:
1. **User-specific templates** - Custom templates created by users
2. **Default template library** - Curated templates provided by platform
3. **Fast retrieval** - Quick template suggestions during memory creation
4. **Semantic search** - Find templates by description/purpose
5. **Sharing** - Optional template sharing between users

---

## Recommended Storage Strategy: Hybrid

### Weaviate for Template Content
**Why**: Semantic search, vector embeddings, fast retrieval

### Firestore for Template Metadata
**Why**: Permissions, sharing, versioning, real-time updates

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Template Storage Architecture                               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Firestore (Metadata & Permissions)                    │ │
│  │                                                         │ │
│  │  templates/                                            │ │
│  │  ├── {template_id}/                                    │ │
│  │  │   ├── owner_user_id                                 │ │
│  │  │   ├── is_public                                     │ │
│  │  │   ├── is_default                                    │ │
│  │  │   ├── version                                       │ │
│  │  │   └── permissions/                                  │ │
│  │  │       └── {user_id}/ (who can use this template)   │ │
│  │  │                                                      │ │
│  │  └── default_templates/                                │ │
│  │      ├── person_profile/                               │ │
│  │      ├── meeting_notes/                                │ │
│  │      ├── restaurant_review/                            │ │
│  │      └── inventory_item/  ← NEW                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Weaviate (Template Content & Search)                  │ │
│  │                                                         │ │
│  │  Template_system (default templates)                   │ │
│  │  Template_{user_id} (user-specific templates)          │ │
│  │                                                         │ │
│  │  - Full template definitions                           │ │
│  │  - Field schemas                                       │ │
│  │  - Trigger keywords                                    │ │
│  │  - Vector embeddings for semantic search              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Template Collections

### 1. Default Template Library (System-Wide)

**Weaviate Collection**: `Template_system`  
**Firestore Collection**: `default_templates/`

**Characteristics**:
- Created and maintained by platform
- Available to all users
- Cannot be modified by users (can be copied)
- Versioned and updated by platform
- Curated for quality and usefulness

**Default Templates**:
```yaml
default_templates:
  - person_profile
  - professional_contact
  - meeting_notes
  - restaurant_review
  - book_review
  - movie_review
  - recipe
  - travel_destination
  - project_tracker
  - goal_tracker
  - habit_tracker
  - inventory_item  # ← NEW
  - checklist_template
  - journal_entry
  - idea_capture
```

### 2. User Templates (Per-User)

**Weaviate Collection**: `Template_{user_id}`  
**Firestore Collection**: `templates/{template_id}`

**Characteristics**:
- Created by users
- Private by default
- Can be shared with other users
- Can be derived from default templates
- User can modify freely

---

## Template Retrieval Flow

### When Creating Memory

```typescript
async function getRelevantTemplates(
  user_id: string,
  content: string,
  context: ConversationContext
): Promise<Template[]> {
  // 1. Search user's templates
  const userTemplates = await weaviateClient
    .collection(`Template_${user_id}`)
    .query.nearText(content, {
      where: { path: 'auto_apply', operator: 'Equal', valueBoolean: true },
      limit: 5
    });
  
  // 2. Search default templates
  const defaultTemplates = await weaviateClient
    .collection('Template_system')
    .query.nearText(content, {
      where: { path: 'auto_apply', operator: 'Equal', valueBoolean: true },
      limit: 5
    });
  
  // 3. Search shared templates (if user has access)
  const sharedTemplates = await getSharedTemplates(user_id, content);
  
  // 4. Combine and rank
  const allTemplates = [
    ...userTemplates.objects,
    ...defaultTemplates.objects,
    ...sharedTemplates
  ];
  
  // 5. Score and filter
  return scoreAndRankTemplates(allTemplates, content, context);
}
```

---

## Default Template Library

### Core Default Templates

#### 1. Person Profile
```yaml
template_name: "Person Profile"
description: "Track information about people you meet"
category: "contacts"
fields:
  - name: "name"
    type: "string"
    required: true
  - name: "relationship"
    type: "string"
    required: false
    options: ["friend", "family", "colleague", "acquaintance", "professional"]
  - name: "company"
    type: "string"
    required: false
  - name: "job_title"
    type: "string"
    required: false
  - name: "contact_info"
    type: "object"
    required: false
    fields:
      - email: string
      - phone: string
      - linkedin: string
  - name: "met_at"
    type: "string"
    required: false
  - name: "interests"
    type: "array"
    required: false
  - name: "notes"
    type: "text"
    required: false
trigger_keywords: ["met", "introduced", "person", "contact"]
```

#### 2. Inventory Item (NEW)
```yaml
template_name: "Inventory Item"
description: "Track items and their storage locations"
category: "organization"
fields:
  - name: "item_name"
    type: "string"
    required: true
    description: "Name of the item"
  - name: "quantity"
    type: "number"
    required: true
    default_value: 1
    validation:
      min: 0
  - name: "unit"
    type: "string"
    required: false
    options: ["pieces", "boxes", "sets", "pairs", "bottles", "cans"]
  - name: "storage_location"
    type: "string"
    required: true
    description: "Where the item is stored (e.g., 'garage bin 4', 'left kitchen drawer')"
  - name: "category"
    type: "string"
    required: false
    options: ["tools", "camping", "electronics", "household", "seasonal", "sports", "kitchen", "other"]
  - name: "condition"
    type: "string"
    required: false
    options: ["new", "good", "worn", "needs_repair", "broken"]
  - name: "last_seen"
    type: "datetime"
    required: false
  - name: "purchase_date"
    type: "datetime"
    required: false
  - name: "expiry_date"
    type: "datetime"
    required: false
  - name: "value"
    type: "number"
    required: false
  - name: "notes"
    type: "text"
    required: false
trigger_keywords: ["stored", "put", "kept", "have", "inventory", "where is", "location"]
trigger_context:
  intent: ["tracking_item", "organizing", "storing"]
```

#### 3. Meeting Notes
```yaml
template_name: "Meeting Notes"
description: "Capture meeting information and action items"
category: "work"
fields:
  - name: "meeting_title"
    type: "string"
    required: true
  - name: "date"
    type: "datetime"
    required: true
  - name: "attendees"
    type: "array"
    required: false
  - name: "agenda_items"
    type: "array"
    required: false
  - name: "discussion_points"
    type: "text"
    required: false
  - name: "decisions_made"
    type: "array"
    required: false
  - name: "action_items"
    type: "array"
    required: false
    item_schema:
      - task: string
      - assignee: string
      - due_date: datetime
  - name: "next_meeting"
    type: "datetime"
    required: false
trigger_keywords: ["meeting", "discussed", "team", "sync", "standup"]
```

---

## Template Sharing

### Sharing Levels

```yaml
TemplateVisibility:
  private:
    - visible_to: [owner]
    - can_use: [owner]
    - can_modify: [owner]
    
  shared:
    - visible_to: [owner, specified_users]
    - can_use: [owner, specified_users]
    - can_modify: [owner]
    
  public:
    - visible_to: [all_users]
    - can_use: [all_users]
    - can_modify: [owner]
    
  default:
    - visible_to: [all_users]
    - can_use: [all_users]
    - can_modify: [platform_admin]
    - immutable: true
```

### Firestore Schema for Sharing

```typescript
// templates/{template_id}
interface TemplateMetadata {
  id: string;
  owner_user_id: string;
  template_name: string;
  
  // Visibility
  visibility: 'private' | 'shared' | 'public' | 'default';
  is_default: boolean;
  is_immutable: boolean;
  
  // Sharing
  shared_with: string[];  // User IDs who can use this
  public_since: Timestamp | null;
  
  // Usage
  usage_count: number;
  unique_users: number;  // How many different users have used it
  
  // Version
  version: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// templates/{template_id}/permissions/{user_id}
interface TemplatePermission {
  user_id: string;
  can_use: boolean;
  can_view: boolean;
  can_copy: boolean;
  granted_at: Timestamp;
  granted_by: string;
}
```

---

## Default Template Management

### 1. Template Initialization

```typescript
// Run once during system setup
async function initializeDefaultTemplates(): Promise<void> {
  const defaultTemplates = [
    personProfileTemplate,
    meetingNotesTemplate,
    restaurantReviewTemplate,
    bookReviewTemplate,
    inventoryItemTemplate,  // ← NEW
    // ... more defaults
  ];
  
  for (const template of defaultTemplates) {
    // Store in Weaviate (Template_system collection)
    const templateId = await weaviateClient
      .collection('Template_system')
      .data.insert({
        ...template,
        is_default: true,
        is_immutable: true,
        created_at: new Date()
      });
    
    // Store metadata in Firestore
    await firestore
      .collection('default_templates')
      .doc(templateId)
      .set({
        template_id: templateId,
        template_name: template.template_name,
        visibility: 'default',
        is_default: true,
        is_immutable: true,
        usage_count: 0,
        created_at: Timestamp.now()
      });
  }
}
```

### 2. Template Updates

```typescript
// Platform admin can update default templates
async function updateDefaultTemplate(
  template_id: string,
  updates: Partial<Template>,
  version: string
): Promise<void> {
  // Create new version in Weaviate
  const newTemplateId = await weaviateClient
    .collection('Template_system')
    .data.insert({
      ...existingTemplate,
      ...updates,
      version,
      previous_version: template_id,
      updated_at: new Date()
    });
  
  // Update Firestore metadata
  await firestore
    .collection('default_templates')
    .doc(template_id)
    .update({
      current_version: newTemplateId,
      version,
      updated_at: Timestamp.now()
    });
  
  // Notify users who have used this template
  await notifyTemplateUpdate(template_id, version);
}
```

### 3. User Copies Default Template

```typescript
// User can copy and customize default templates
async function copyTemplate(
  source_template_id: string,
  user_id: string,
  customizations?: Partial<Template>
): Promise<string> {
  // Get default template
  const defaultTemplate = await weaviateClient
    .collection('Template_system')
    .data.getById(source_template_id);
  
  // Create user's copy in their collection
  const userTemplateId = await weaviateClient
    .collection(`Template_${user_id}`)
    .data.insert({
      ...defaultTemplate,
      ...customizations,
      owner_user_id: user_id,
      derived_from: source_template_id,
      is_default: false,
      is_immutable: false,
      created_at: new Date()
    });
  
  // Store metadata in Firestore
  await firestore
    .collection('templates')
    .doc(userTemplateId)
    .set({
      template_id: userTemplateId,
      owner_user_id: user_id,
      template_name: customizations?.template_name || defaultTemplate.template_name,
      visibility: 'private',
      derived_from: source_template_id,
      created_at: Timestamp.now()
    });
  
  return userTemplateId;
}
```

---

## Template Query Strategy

### Unified Template Search

```typescript
async function searchTemplates(
  user_id: string,
  query: string,
  options: SearchOptions
): Promise<Template[]> {
  const results = [];
  
  // 1. Search default templates (always available)
  const defaultTemplates = await weaviateClient
    .collection('Template_system')
    .query.nearText(query, {
      where: { path: 'is_default', operator: 'Equal', valueBoolean: true },
      limit: 5
    });
  results.push(...defaultTemplates.objects.map(t => ({
    ...t.properties,
    source: 'default',
    can_modify: false
  })));
  
  // 2. Search user's templates
  const userTemplates = await weaviateClient
    .collection(`Template_${user_id}`)
    .query.nearText(query, {
      limit: 10
    });
  results.push(...userTemplates.objects.map(t => ({
    ...t.properties,
    source: 'user',
    can_modify: true
  })));
  
  // 3. Search public templates (created by other users)
  const publicTemplates = await searchPublicTemplates(query, user_id);
  results.push(...publicTemplates.map(t => ({
    ...t,
    source: 'community',
    can_modify: false,
    can_copy: true
  })));
  
  // 4. Rank by relevance and user preference
  return rankTemplates(results, user_id);
}
```

---

## Default Template Library

### Core Templates (15 templates)

1. **Person Profile** - Track people you meet
2. **Professional Contact** - Business contacts
3. **Meeting Notes** - Meeting documentation
4. **Restaurant Review** - Dining experiences
5. **Book Review** - Books read
6. **Movie Review** - Movies watched
7. **Recipe** - Cooking recipes
8. **Travel Destination** - Places visited
9. **Project Tracker** - Project management
10. **Goal Tracker** - Personal/professional goals
11. **Habit Tracker** - Daily habits
12. **Inventory Item** - Home organization ← NEW
13. **Checklist Template** - Reusable checklists
14. **Journal Entry** - Daily journaling
15. **Idea Capture** - Quick ideas and brainstorms

### Template Categories

```typescript
const TEMPLATE_CATEGORIES = {
  contacts: ['person_profile', 'professional_contact'],
  work: ['meeting_notes', 'project_tracker'],
  personal: ['journal_entry', 'goal_tracker', 'habit_tracker'],
  entertainment: ['book_review', 'movie_review', 'restaurant_review'],
  organization: ['inventory_item', 'checklist_template'],
  creative: ['recipe', 'idea_capture'],
  travel: ['travel_destination']
};
```

---

## Template Discovery

### Browse Default Templates

```typescript
// Tool: remember_list_default_templates
remember_list_default_templates({
  category?: string,
  sort_by?: 'popularity' | 'name' | 'recent',
  limit?: number
}): Template[]

// Example
const templates = await remember_list_default_templates({
  category: 'organization',
  sort_by: 'popularity'
});

// Returns:
[
  {
    template_name: "Inventory Item",
    description: "Track items and storage locations",
    usage_count: 15234,
    rating: 4.8,
    is_default: true
  },
  {
    template_name: "Checklist Template",
    description: "Create reusable checklists",
    usage_count: 12891,
    rating: 4.7,
    is_default: true
  }
]
```

### Template Marketplace (Future)

```typescript
// Community-contributed templates
interface TemplateMarketplace {
  featured_templates: Template[];
  trending_templates: Template[];
  top_rated_templates: Template[];
  new_templates: Template[];
  
  // Search
  search(query: string): Template[];
  
  // Categories
  browse_by_category(category: string): Template[];
  
  // User contributions
  submit_template(template: Template): Promise<string>;
  rate_template(template_id: string, rating: number): Promise<void>;
}
```

---

## Template Versioning

### Version Management

```typescript
interface TemplateVersion {
  template_id: string;
  version: string;  // "1.0", "1.1", "2.0"
  changes: string;  // What changed
  created_at: datetime;
  previous_version: string | null;
  is_breaking: boolean;  // Breaking changes?
}

// When default template updated
async function updateDefaultTemplateVersion(
  template_id: string,
  new_version: Template,
  version_number: string
): Promise<void> {
  // Keep old version for backward compatibility
  await archiveTemplateVersion(template_id, current_version);
  
  // Create new version
  const newId = await createTemplateVersion(new_version, version_number);
  
  // Update references
  await updateTemplateReferences(template_id, newId);
  
  // Notify users
  if (new_version.is_breaking) {
    await notifyBreakingChange(template_id, version_number);
  }
}
```

---

## Performance Optimization

### 1. Template Caching

```typescript
// Cache default templates (rarely change)
const defaultTemplateCache = new Map<string, Template>();

async function getDefaultTemplate(template_id: string): Promise<Template> {
  // Check cache
  if (defaultTemplateCache.has(template_id)) {
    return defaultTemplateCache.get(template_id)!;
  }
  
  // Fetch from Weaviate
  const template = await weaviateClient
    .collection('Template_system')
    .data.getById(template_id);
  
  // Cache indefinitely (default templates rarely change)
  defaultTemplateCache.set(template_id, template);
  
  return template;
}
```

### 2. Preload Popular Templates

```typescript
// On server startup, preload top 10 most used templates
async function preloadPopularTemplates(): Promise<void> {
  const popular = await firestore
    .collection('default_templates')
    .orderBy('usage_count', 'desc')
    .limit(10)
    .get();
  
  for (const doc of popular.docs) {
    const template = await getDefaultTemplate(doc.id);
    defaultTemplateCache.set(doc.id, template);
  }
  
  logger.info('Preloaded popular templates', {
    count: popular.size
  });
}
```

---

## Implementation Checklist

### Phase 1: Basic Template Storage
- [ ] Create `Template_system` collection in Weaviate
- [ ] Create `default_templates` collection in Firestore
- [ ] Implement 5 core default templates
- [ ] Implement template retrieval

### Phase 2: User Templates
- [ ] Create per-user template collections
- [ ] Implement template CRUD operations
- [ ] Implement template copying
- [ ] Add template permissions

### Phase 3: Default Library
- [ ] Add all 15 default templates
- [ ] Implement template categories
- [ ] Add template discovery UI
- [ ] Implement template ratings

### Phase 4: Advanced Features
- [ ] Template sharing
- [ ] Template marketplace
- [ ] Template versioning
- [ ] Community contributions

---

## Benefits

### For Users
- **Quick Start**: Ready-to-use templates
- **Consistency**: Structured memory creation
- **Discovery**: Browse template library
- **Customization**: Copy and modify defaults

### For Platform
- **Onboarding**: Help new users get started
- **Best Practices**: Curated templates
- **Community**: Users can share templates
- **Monetization**: Premium template packs (future)

---

**Status**: Design Specification  
**Storage**: Weaviate for content, Firestore for metadata  
**Default Library**: 15 curated templates including inventory_item  
**Recommendation**: Implement default library in Phase 2
