# Bitespeed Backend Task – Identity Reconciliation

This project implements the `/identify` API for identity reconciliation as part of the Bitespeed backend assignment.

## Tech Stack
- Node.js
- Express
- PostgreSQL (Neon)
- Prisma ORM

## API Endpoint

### POST /identify

**Request Body**
```json
{
  "email": "string | null",
  "phoneNumber": "string | null"
}
```

**Response**

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["primary@email.com", "secondary@email.com"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2, 3]
  }
}
```

### Logic Overview

- Contacts are linked if they share email or phone number.
- The oldest contact is treated as the primary.
- New information creates secondary contacts.
- If two primary contacts collide, the newer one is converted to secondary.

## Setup Instructions

``` Bash
npm install
npx prisma migrate dev
npm run dev
```

# Hosted Endpoint
https://<your-render-url>/identify
