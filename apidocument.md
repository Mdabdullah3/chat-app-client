# Chat Application API Documentation

**Base REST URL:** `https://frontend-task-chatapp.onrender.com/api`
**WebSocket URL:** `https://frontend-task-chatapp.onrender.com/` (Socket.io path: `/socket.io/`)

---

## Authentication

All protected endpoints require a JWT token in the HTTP authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

---

## Auth Endpoints

### 1. Login / Register

One-step authentication. If the phone number is new, a new account is registered automatically.

```
POST /auth/login
Access: Public
```

**Request Body:**

```json
{
  "phone": "+8801512345678",
  "name": "Ada Lovelace"
}
```

**Success Response (200/201):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "60fbfb...",
    "phone": "+8801512345678",
    "name": "Ada Lovelace"
  }
}
```

---

### 2. Get Current User Session

Validates the current token and restores the user session.

```
GET /auth/me
Access: Protected (Bearer Token Required)
```

**Success Response (200):**

```json
{
  "id": "60fbfb...",
  "phone": "+8801512345678",
  "name": "Ada Lovelace"
}
```

---

## Users Endpoints

### Search Users

Search users by name or phone number.

```
GET /users/search?q={search_term}
Access: Protected
```

**Query Parameters:**

| Parameter | Type   | Required | Description                 |
| --------- | ------ | -------- | --------------------------- |
| `q`       | string | Yes      | Search term (name or phone) |

**Success Response (200):**

```json
[
  {
    "id": "60fbfb...",
    "phone": "+8801512345678",
    "name": "Ada Lovelace"
  },
  {
    "id": "60fbfc...",
    "phone": "+8801598765432",
    "name": "Alan Turing"
  }
]
```

---

## Conversations & Groups Endpoints

### 1. List Conversations

Retrieve all conversations (1-to-1 and group chats) that the current user is a participant of.

```
GET /conversations
Access: Protected
```

**Success Response (200):**

```json
[
  {
    "id": "conv_123",
    "name": "Project Team",
    "isGroup": true,
    "participants": [
      { "id": "user_1", "name": "Ada Lovelace" },
      { "id": "user_2", "name": "Alan Turing" }
    ],
    "admins": ["user_1"],
    "lastMessage": {
      "text": "Hello Team!",
      "createdAt": "2026-08-22T10:00:00.000Z"
    }
  }
]
```

---

### 2. Start Direct Conversation (1-to-1)

Initialize a one-to-one conversation with another user.

```
POST /conversations
Access: Protected
```

**Request Body:**

```json
{
  "userId": "60fbfb..."
}
```

**Success Response (200/201):** Returns the created conversation object.

---

### 3. Create Group Conversation

Create a group chat with multiple participants. The creator automatically becomes the admin.

```
POST /conversations/group
Access: Protected
```

**Request Body:**

```json
{
  "name": "Project Alpha",
  "participantIds": ["user_2", "user_3"]
}
```

**Success Response (201 Created):** Returns the created group conversation object.

---

### 4. Manage Group Participants

Add or remove participants. **Admin only** (except leaving own group).

**Add Participant:**

```
POST /conversations/{id}/participants
Access: Protected (Admin Only)
```

```json
{ "userId": "user_4" }
```

**Remove / Leave Participant:**

```
DELETE /conversations/{id}/participants/{userId}
Access: Protected
```

> Passing your own `userId` will leave the group.

---

### 5. Group Admin & Settings

**Promote to Admin:**

```
POST /conversations/{id}/admins
Access: Protected (Admin Only)
```

```json
{ "userId": "user_2" }
```

**Rename Group:**

```
PATCH /conversations/{id}
Access: Protected (Admin Only)
```

```json
{ "name": "New Group Name" }
```

---

## Messages Endpoints

### 1. Get Conversation Messages (With Pagination)

```
GET /conversations/{id}/messages
Access: Protected
```

**Query Parameters:**

| Parameter | Type   | Required | Description                           |
| --------- | ------ | -------- | ------------------------------------- |
| `limit`   | int    | No       | Max messages to return (default: 20)  |
| `before`  | string | No       | Cursor ID for fetching older messages |

**Success Response (200):**

```json
[
  {
    "id": "msg_001",
    "conversationId": "conv_123",
    "sender": {
      "id": "user_2",
      "name": "Alan Turing"
    },
    "text": "Hi everyone!",
    "createdAt": "2026-08-22T09:55:00.000Z"
  }
]
```

---

### 2. Send Message via REST API

```
POST /messages
Access: Protected
```

**Request Body:**

```json
{
  "conversationId": "conv_123",
  "text": "Hello world!"
}
```

---

## WebSocket (Socket.io)

### Connection & Authentication

```javascript
import io from "socket.io-client";

const socket = io("https://frontend-task-chatapp.onrender.com", {
  auth: { token: "YOUR_JWT_TOKEN" },
});
```

---

### Client-to-Server Events

| Event          | Description                   | Payload                                    |
| -------------- | ----------------------------- | ------------------------------------------ |
| `message:send` | Send a message over WebSocket | `{ conversationId: string, text: string }` |

**Example:**

```javascript
socket.emit("message:send", {
  conversationId: "conv_123",
  text: "Hello via WebSocket!",
});
```

---

### Server-to-Client Events

| Event                  | Description                                              | Payload           |
| ---------------------- | -------------------------------------------------------- | ----------------- |
| `message:new`          | Triggers when a new message is received                  | Message object    |
| `conversation:updated` | Triggers on group updates (rename, join, leave, promote) | Conversation data |

**Example Listeners:**

```javascript
// Receive new messages in real-time
socket.on("message:new", (message) => {
  console.log("New message:", message);
});

// Listen for group changes
socket.on("conversation:updated", (conversation) => {
  console.log("Conversation updated:", conversation);
});
```

---

## Response Format Reference

All responses follow a consistent JSON structure:

```json
{
  "token": "...",        // Auth endpoints only
  "user": { ... },       // Auth endpoints only
  "id": "...",           // Resource ID
  "participants": [],    // Conversation participants
  "admins": [],          // Group admins
  "lastMessage": { ... } // Latest message in conversation
}
```

---

## Error Responses

All endpoints return standard HTTP status codes:

| Status | Meaning                                 |
| ------ | --------------------------------------- |
| 200    | Success                                 |
| 201    | Created                                 |
| 400    | Bad Request — Invalid input             |
| 401    | Unauthorized — Missing or invalid token |
| 403    | Forbidden — Insufficient permissions    |
| 404    | Not Found — Resource does not exist     |
| 500    | Internal Server Error                   |

---

_Last updated: 2026-08-22_
