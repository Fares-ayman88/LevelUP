# PocketBase (Local Server)

## Run

```powershell
.\run-pocketbase.ps1
```

Temporary public tunnel for the deployed web app:

```powershell
.\run-public-pocketbase.ps1
```

Admin dashboard:

```
http://127.0.0.1:8090/_/
```

Data directory:

```
server/pocketbase/pb_data
```

## Collections (Required)

Create these collections in the PocketBase admin dashboard:

### `courses`

Fields:
- `title` (text)
- `category` (text)
- `mentorName` (text)
- `mentorSubtitle` (text)
- `mentorImageUrl` (text)
- `coverImageUrl` (text)
- `mentorId` (text)
- `price` (text)
- `oldPrice` (text)
- `rating` (text)
- `students` (text)
- `classes` (number)
- `hours` (number)
- `bookmarked` (bool)
- `sections` (json)
- `coverImage` (file, max 1 file)
- `lessonVideos` (file, max 200 files)

### `mentors`

Fields:
- `name` (text)
- `category` (text)
- `subtitle` (text)
- `courses` (text)
- `students` (text)
- `ratings` (text)
- `imageUrl` (text)
- `image` (file, max 1 file)

### `mentor_chats`

Fields:
- `conversationKey` (text, unique)
- `userId` (text)
- `mentorId` (text)
- `mentorName` (text)
- `mentorRole` (text)
- `mentorImagePath` (text)
- `lastMessage` (text)
- `lastMessageAt` (text)
- `lastMessageFromUser` (bool)
- `lastSeenByMentor` (bool)
- `unreadForUser` (number, int)
- `lastUserMessageId` (text)
- `updatedAt` (text)

### `mentor_chat_messages`

Fields:
- `chatId` (text)
- `conversationKey` (text)
- `senderRole` (text)
- `senderId` (text)
- `text` (text)
- `seenByMentor` (bool)
- `createdAt` (text)

### `support_chats`

Fields:
- `userId` (text, unique)
- `userName` (text)
- `userEmail` (text)
- `adminId` (text)
- `adminName` (text)
- `adminEmail` (text)
- `lastMessage` (text)
- `lastMessageSender` (text)
- `lastMessageAt` (text)
- `unreadForAdmin` (number, int)
- `unreadForUser` (number, int)
- `lastReadByAdminAt` (text)
- `lastReadByUserAt` (text)
- `activeForAdmin` (bool)
- `activeForUser` (bool)
- `updatedAt` (text)

### `support_chat_messages`

Fields:
- `chatId` (text)
- `chatKey` (text)
- `senderRole` (text)
- `senderId` (text)
- `text` (text)
- `type` (text)
- `attachments` (json)
- `createdAt` (text)

## API Rules

For quick testing from the app, leave these rules **empty** on required collections:
- `List` rule: `""` (empty)
- `View` rule: `""` (empty)
- `Create` rule: `""` (empty)
- `Update` rule: `""` (empty)
- `Delete` rule: `null` (optional; keep locked unless needed)

Tighten these rules later for production.

## App Config

Update the PocketBase URL in:

```
lib/services/pocketbase_config.dart
```

Examples:
- Android emulator: `http://10.0.2.2:8090`
- Local machine: `http://127.0.0.1:8090`
- Phone on Wi-Fi: `http://<LAN-IP>:8090`

## Backup

```powershell
.\backup-pocketbase.ps1
```

Backups are stored in:

```
server/pocketbase/backups
```

## Notes

- Keep this process running to keep the API online.
- `http://127.0.0.1:8090` only works on the same machine or local network. A deployed frontend such as `vercel.app` cannot reach your local PocketBase unless you expose it through a public HTTPS domain or tunnel.
- Stop PocketBase before backup for best consistency.
