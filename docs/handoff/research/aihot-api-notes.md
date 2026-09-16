# AIHOT Codex Resets API

- Endpoint: GET https://aihot.news/api/v1/codex-resets
- Spec: https://aihot.news/openapi-v1.json (operationId: codexResets)
- Auth: none for read
- CORS: * on GET
- Poll: >= 5 minutes; If-None-Match / ETag
- Version probe used by their page: /api/public/codex-reset-version
- Terms: https://aihot.news/terms — personal/non-commercial OK with attribution; commercial needs written auth
- Contact: wzglyay@virxact.com

Response shape (schemaVersion 1):
- timezone: Asia/Shanghai
- checkedAt, historyFrom, count
- events[]: id, type (direct_reset|reset_credit), label, status (announced|confirmed),
  title, scope, createdAt, updatedAt, confirmedAt, occurredOn, confirmationBasis,
  schedule, posts[], url

Do NOT scrape https://aihot.news/codex-reset HTML.
