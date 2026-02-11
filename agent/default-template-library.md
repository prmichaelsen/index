# Default Template Library - Complete Specification

**Concept**: Curated default templates for remember-mcp  
**Created**: 2026-02-11  
**Status**: Design Specification (FINAL)

---

## Complete Template Library (17 Templates)

### Contacts & Relationships (3 templates)

#### 1. Person Profile (Personal)
```yaml
template_name: "Person Profile"
description: "Track personal relationships - friends, family, acquaintances"
category: "contacts_personal"
fields:
  - name: "name"
    type: "string"
    required: true
  - name: "relationship"
    type: "string"
    required: false
    options: ["friend", "family", "acquaintance", "neighbor", "community"]
  - name: "how_we_met"
    type: "text"
    required: false
    description: "Story of how you met - include fun anecdotes!"
  - name: "met_at"
    type: "string"
    required: false
  - name: "met_date"
    type: "datetime"
    required: false
  - name: "birthday"
    type: "datetime"
    required: false
  - name: "interests"
    type: "array"
    required: false
  - name: "contact_info"
    type: "object"
    required: false
    fields:
      - phone: string
      - email: string
      - address: string
      - social_media: string
  - name: "notes"
    type: "text"
    required: false
  - name: "last_interaction"
    type: "datetime"
    required: false
trigger_keywords: ["met", "friend", "family", "know", "introduced"]
trigger_context:
  relationship_type: "personal"
```

#### 2. Professional Contact
```yaml
template_name: "Professional Contact"
description: "Track business and professional relationships"
category: "contacts_professional"
fields:
  - name: "name"
    type: "string"
    required: true
  - name: "company"
    type: "string"
    required: false
  - name: "job_title"
    type: "string"
    required: false
  - name: "industry"
    type: "string"
    required: false
  - name: "how_we_met"
    type: "text"
    required: false
    description: "Professional context of how you met"
  - name: "met_at"
    type: "string"
    required: false
    description: "Conference, meeting, introduction, etc."
  - name: "met_date"
    type: "datetime"
    required: false
  - name: "contact_info"
    type: "object"
    required: false
    fields:
      - email: string
      - phone: string
      - linkedin: string
      - twitter: string
      - website: string
  - name: "expertise"
    type: "array"
    required: false
    description: "Their areas of expertise"
  - name: "can_help_with"
    type: "array"
    required: false
    description: "What they can help you with"
  - name: "notes"
    type: "text"
    required: false
  - name: "last_interaction"
    type: "datetime"
    required: false
  - name: "follow_up"
    type: "datetime"
    required: false
    description: "When to follow up"
trigger_keywords: ["colleague", "professional", "business", "work", "conference", "networking"]
trigger_context:
  relationship_type: "professional"
  location_type: "office" | "conference"
```

#### 3. Contact (Simple)
```yaml
template_name: "Contact"
description: "Simple contact information - use when you just need basics"
category: "contacts_simple"
fields:
  - name: "name"
    type: "string"
    required: true
  - name: "phone"
    type: "string"
    required: false
  - name: "email"
    type: "string"
    required: false
  - name: "notes"
    type: "text"
    required: false
trigger_keywords: ["contact", "phone", "email", "reach"]
```

---

### Work & Productivity (3 templates)

#### 4. Meeting Notes
```yaml
template_name: "Meeting Notes"
description: "Capture meeting information and action items"
category: "work"
fields:
  - meeting_title (required)
  - date (required)
  - attendees (array)
  - agenda_items (array)
  - discussion_points (text)
  - decisions_made (array)
  - action_items (array with task, assignee, due_date)
  - next_meeting (datetime)
trigger_keywords: ["meeting", "discussed", "team", "sync", "standup"]
```

#### 5. Project Tracker
```yaml
template_name: "Project Tracker"
description: "Track project information and progress"
category: "work"
fields:
  - project_name (required)
  - status (enum: planning, active, paused, completed)
  - start_date (datetime)
  - end_date (datetime)
  - stakeholders (array)
  - milestones (array)
  - current_phase (string)
  - blockers (array)
  - notes (text)
trigger_keywords: ["project", "working on", "building", "developing"]
```

#### 6. Task/Action Item
```yaml
template_name: "Task"
description: "Individual task or action item"
category: "work"
fields:
  - task_description (required)
  - due_date (datetime)
  - priority (enum: low, medium, high, urgent)
  - status (enum: todo, in_progress, blocked, done)
  - assignee (string)
  - project (string)
  - estimated_hours (number)
  - notes (text)
trigger_keywords: ["task", "todo", "need to", "action item"]
```

---

### Personal & Lifestyle (4 templates)

#### 7. Journal Entry
```yaml
template_name: "Journal Entry"
description: "Daily journal and reflections"
category: "personal"
fields:
  - date (required)
  - mood (enum: great, good, okay, bad, terrible)
  - highlights (array)
  - challenges (array)
  - gratitude (array)
  - reflections (text)
  - tomorrow_goals (array)
trigger_keywords: ["today", "feeling", "journal", "reflection"]
```

#### 8. Goal Tracker
```yaml
template_name: "Goal"
description: "Personal or professional goals"
category: "personal"
fields:
  - goal_name (required)
  - category (enum: health, career, financial, personal, learning)
  - target_date (datetime)
  - current_progress (number, 0-100)
  - milestones (array)
  - obstacles (array)
  - notes (text)
trigger_keywords: ["goal", "want to", "achieve", "target"]
```

#### 9. Habit Tracker
```yaml
template_name: "Habit"
description: "Track daily habits and routines"
category: "personal"
fields:
  - habit_name (required)
  - frequency (enum: daily, weekly, monthly)
  - current_streak (number)
  - best_streak (number)
  - trigger (string)
  - reward (string)
  - notes (text)
trigger_keywords: ["habit", "routine", "daily", "every day"]
```

#### 10. Inventory Item
```yaml
template_name: "Inventory Item"
description: "Track items and their storage locations"
category: "organization"
fields:
  - item_name (required)
  - quantity (required)
  - storage_location (required)
  - category (enum: tools, camping, electronics, household, seasonal, sports, kitchen)
  - condition (enum: new, good, worn, needs_repair)
  - purchase_date (datetime)
  - value (number)
  - notes (text)
trigger_keywords: ["stored", "put", "kept", "where is", "inventory"]
```

---

### Entertainment & Reviews (3 templates)

#### 11. Restaurant Review
```yaml
template_name: "Restaurant Review"
description: "Track dining experiences"
category: "entertainment"
fields:
  - restaurant_name (required)
  - cuisine_type (string)
  - rating (number, 1-5)
  - favorite_dishes (array)
  - price_range (enum: $, $$, $$$, $$$$)
  - would_return (boolean)
  - notes (text)
trigger_keywords: ["restaurant", "ate at", "dinner", "lunch", "food"]
```

#### 12. Book Review
```yaml
template_name: "Book Review"
description: "Track books you've read"
category: "entertainment"
fields:
  - title (required)
  - author (required)
  - rating (number, 1-5)
  - genre (string)
  - date_finished (datetime)
  - summary (text)
  - favorite_quotes (array)
  - would_recommend (boolean)
trigger_keywords: ["book", "reading", "finished reading", "author"]
```

#### 13. Movie/Show Review
```yaml
template_name: "Movie Review"
description: "Track movies and shows you've watched"
category: "entertainment"
fields:
  - title (required)
  - type (enum: movie, tv_show, documentary)
  - rating (number, 1-5)
  - genre (string)
  - date_watched (datetime)
  - summary (text)
  - would_recommend (boolean)
trigger_keywords: ["movie", "watched", "show", "film", "series"]
```

---

### Creative & Learning (4 templates)

#### 14. Recipe
```yaml
template_name: "Recipe"
description: "Cooking recipes and instructions"
category: "creative"
fields:
  - recipe_name (required)
  - cuisine_type (string)
  - servings (number)
  - prep_time (number, minutes)
  - cook_time (number, minutes)
  - ingredients (array)
  - instructions (array)
  - difficulty (enum: easy, medium, hard)
  - notes (text)
trigger_keywords: ["recipe", "cooking", "ingredients", "make"]
```

#### 15. Idea Capture
```yaml
template_name: "Idea"
description: "Quick ideas and brainstorms"
category: "creative"
fields:
  - idea_title (required)
  - description (text)
  - category (string)
  - potential_impact (enum: low, medium, high)
  - next_steps (array)
  - related_ideas (array)
trigger_keywords: ["idea", "thought", "what if", "brainstorm"]
```

#### 16. Learning Note
```yaml
template_name: "Learning Note"
description: "Capture things you've learned"
category: "learning"
fields:
  - topic (required)
  - category (string)
  - key_concepts (array)
  - examples (array)
  - resources (array)
  - proficiency (enum: beginner, intermediate, advanced)
  - notes (text)
trigger_keywords: ["learned", "discovered", "found out", "TIL"]
```

#### 17. Travel Destination
```yaml
template_name: "Travel Destination"
description: "Places you've visited or want to visit"
category: "travel"
fields:
  - destination_name (required)
  - country (string)
  - visited (boolean)
  - visit_date (datetime)
  - rating (number, 1-5)
  - highlights (array)
  - recommendations (array)
  - would_return (boolean)
  - notes (text)
trigger_keywords: ["travel", "visited", "trip", "destination", "vacation"]
```

---

## Template Categories (Updated)

```typescript
const TEMPLATE_CATEGORIES = {
  contacts_personal: ['person_profile', 'contact'],
  contacts_professional: ['professional_contact'],
  work: ['meeting_notes', 'project_tracker', 'task'],
  personal: ['journal_entry', 'goal_tracker', 'habit_tracker'],
  organization: ['inventory_item'],
  entertainment: ['restaurant_review', 'book_review', 'movie_review'],
  creative: ['recipe', 'idea_capture'],
  learning: ['learning_note'],
  travel: ['travel_destination']
};
```

---

## Comparison: Personal vs Professional Contacts

### Person Profile (Personal)
**Use For**:
- Friends and family
- Social connections
- Community members
- Neighbors

**Key Fields**:
- `relationship`: friend, family, neighbor
- `birthday`: Important for personal relationships
- `interests`: Hobbies and personal interests
- `how_we_met`: Personal story and anecdotes

**Example**:
```yaml
name: "Alex Johnson"
relationship: "friend"
how_we_met: "Met at a hiking meetup in 2024. We both love trail running and have been hiking buddies ever since. He introduced me to rock climbing."
birthday: "1990-05-15"
interests: ["hiking", "rock climbing", "photography"]
```

### Professional Contact
**Use For**:
- Business contacts
- Colleagues
- Clients
- Professional network

**Key Fields**:
- `company`: Where they work
- `job_title`: Their role
- `expertise`: What they're good at
- `can_help_with`: How they can help you
- `follow_up`: When to reconnect

**Example**:
```yaml
name: "Sarah Chen"
company: "Google"
job_title: "Senior Product Manager"
how_we_met: "Met at TechCrunch Disrupt 2026. She gave a talk on AI product development. We discussed challenges of building AI products."
expertise: ["product management", "AI products", "user research"]
can_help_with: ["product strategy", "AI ethics", "team building"]
follow_up: "2026-03-15"
```

### Contact (Simple)
**Use For**:
- Quick contact info
- Service providers
- Casual acquaintances
- When you just need phone/email

**Key Fields**:
- Just name, phone, email, notes
- Minimal fields
- Quick capture

---

**Status**: Design Specification (FINAL)  
**Total Templates**: 17 (3 contact types, 3 work, 4 personal, 3 entertainment, 4 creative/learning)  
**Key Update**: Separate personal and professional contact templates
