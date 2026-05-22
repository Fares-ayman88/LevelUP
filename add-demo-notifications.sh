#!/bin/bash
# Script to add demo notifications to PocketBase

BASE_URL="http://localhost:8090"

# Create demo notifications
for i in {1..5}; do
  curl -X POST "$BASE_URL/api/collections/notifications/records" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"Demo Notification $i\",
      \"message\": \"This is a demo notification message $i\",
      \"isRead\": $([ $((i % 2)) -eq 0 ] && echo 'false' || echo 'true'),
      \"icon\": \"/assets/notifications/Circle.svg\"
    }" \
    2>&1 | jq '.' || echo "Failed to create notification $i"
done
