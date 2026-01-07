# Tags Placeholder

## Title

Tags placeholder (manage + attach to cards; no scheduling impact)

## Goal

Basic tags management without affecting FSRS/sprint selection (MVP placeholder).

## Scope

Server: Tag CRUD + card tag assignment.
Client: Tag management screen + tag picker in Card Editor.

## Acceptance Criteria

- User can create, list, and delete tags.
- User can attach/detach tags from cards.
- Tags are displayed on cards but do NOT affect scheduling or sprint selection.
- Tag names are unique per user.

## Data Model

Already defined in Ticket 01:

```prisma
model Tag {
  id        String   @id @default(cuid())
  name      String
  userId    String
  createdAt DateTime @default(now())

  user      User      @relation(...)
  cards     CardTag[]

  @@unique([userId, name])
}

model CardTag {
  cardId String
  tagId  String

  card Card @relation(...)
  tag  Tag  @relation(...)

  @@id([cardId, tagId])
}
```

## Endpoints

### `GET /api/tags`

Response:

```typescript
{
  tags: TagDTO[];
}
```

### `POST /api/tags`

Request:

```typescript
{
  name: string;
}
```

Response:

```typescript
{
  tag: TagDTO;
}
```

### `DELETE /api/tags/:id`

Response: 204 No Content

Behavior: Deletes tag and all CardTag associations.

### Card Tag Assignment

Via `PATCH /api/cards/:id`:

```typescript
{
  tagIds: string[]; // replaces all tags on card
}
```

## Tag Picker Component

```
+----------------------------------+
| Tags                             |
+----------------------------------+
| [x] vocabulary                   |
| [x] grammar                      |
| [ ] advanced                     |
| [ ] review-later                 |
+----------------------------------+
| + Add new tag...                 |
+----------------------------------+
```

- Checkbox list of existing tags.
- Inline "Add new tag" input.
- Selected tags saved with card.

## Tag Management Screen

Accessible from Settings:

```
+----------------------------------+
| Manage Tags                      |
+----------------------------------+
| vocabulary              [Delete] |
| grammar                 [Delete] |
| advanced                [Delete] |
| review-later            [Delete] |
+----------------------------------+
| + Create Tag                     |
+----------------------------------+
```

## Subtasks

- [ ] **14.1** Server: `GET /api/tags` endpoint.
- [ ] **14.2** Server: `POST /api/tags` endpoint with uniqueness validation.
- [ ] **14.3** Server: `DELETE /api/tags/:id` endpoint.
- [ ] **14.4** Server: update `PATCH /api/cards/:id` to accept `tagIds`.
- [ ] **14.5** Server: include tags in card response DTOs.
- [ ] **14.6** Client: create TagPicker component.
- [ ] **14.7** Client: integrate TagPicker in Card Editor.
- [ ] **14.8** Client: create Tag Management screen.
- [ ] **14.9** Client: add navigation to Tag Management from Settings.

## Future Considerations (Post-MVP)

- Tag-based filtering in deck/card lists.
- Tag-driven scheduling weights.
- Tag analytics.

## Dependencies

- Ticket 01 (Tag/CardTag models).
- Ticket 00 (card PATCH endpoint).

## Estimated Effort

Small-Medium
