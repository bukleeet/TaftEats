# TaftEats – Restaurant Review Web App

A Node.js/Express/MongoDB web application for reviewing restaurants around the DLSU Taft campus.

---

## Prerequisites

- **Node.js** v18 or later  
- **MongoDB** running locally on `mongodb://127.0.0.1:27017`

---

## Setup & Installation

### 1. Install dependencies

```bash
npm install
```

### 2. Ensure MongoDB is running

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Windows
net start MongoDB

# Linux (systemd)
sudo systemctl start mongod
```

### 3. Seed the database

Seed establishments and reviews (run in a MongoDB shell or MongoDB Compass using the script at `src/database`):

```
src/database  ← your existing insertMany script for establishments and reviews
```

Then seed user accounts (students + establishment owners):

```bash
npm run seed-users
```

This will print the available login credentials to the console.

### 4. Start the server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

App runs at **http://localhost:3000**

---

## Sample Login Credentials

| Role    | Username        | Password         |
|---------|-----------------|------------------|
| Student | `jane_d`        | `password123`    |
| Student | `miggy`         | `password123`    |
| Student | `ella_s`        | `password123`    |
| Owner   | `owner_prelude` | `OwnerPrelude#1` |
| Owner   | `owner_barn`    | `OwnerBarn#1`    |
| Owner   | `owner_callecafe` | `OwnerCalle#1` |
| Owner   | `owner_angrydobo` | `OwnerAngry#1` |
| Owner   | `owner_laelotes`  | `OwnerLaElotes#1` |

> Owner accounts are tied to their respective establishments and can respond to reviews on their establishment.

---

## Features Implemented (Phase 2 – assigned tasks)

### Login / Logout
- `POST /login` — authenticates using crypto-based password verification, creates a session
- "Remember Me" checkbox extends the session cookie to **3 weeks**; unchecked = session-only cookie
- `POST /logout` — destroys session and clears cookie

### Create a Review
- Only logged-in users can post reviews
- Required fields: **title**, **body** (rich text), **star rating** (1–5)
- Optional: **media attachment** (image or video, up to 20 MB)
- Body is sanitized server-side with a regex whitelist sanitizer (no external package) to prevent XSS
- Route: `POST /reviews`

### Edit / Delete a Review (CRUD requirement)
- Only the review's author can edit or delete their review
- Edited reviews display an "(edited)" label
- Routes: `PUT /reviews/:reviewId`, `DELETE /reviews/:reviewId`

### Mark as Helpful / Unhelpful
- Logged-in users can vote once per review (one vote type at a time)
- Voting the same type again **toggles it off** (takes back the vote)
- Voting the opposite type automatically removes the previous vote
- Route: `POST /reviews/:reviewId/vote`

### Establishment Owner Response
- Owner accounts are created manually via `npm run seed-users`
- Each owner is tied to a single establishment via `ownedEstablishment`
- Owners see a "Respond as Owner" button only on reviews for their establishment
- Owner response is sanitized and displayed publicly below the review
- Owners can delete their own response
- Routes: `POST /reviews/:reviewId/owner-response`, `DELETE /reviews/:reviewId/owner-response`

---

## Project Structure

```
app.js                          ← Entry point, session + middleware setup
src/
  controllers/
    authController.js           ← Login / logout logic
    reviewController.js         ← Full review CRUD + votes + owner response
    establishmentController.js
    aboutController.js
  models/
    users.js                    ← User schema (student | owner roles, crypto hashing)
    reviews.js                  ← Review schema (votes, owner response, media)
    establishments.js
    about.js
  routes/
    authRoutes.js               ← /login, /logout
    reviewRoutes.js             ← All review endpoints
    establishmentRoutes.js
    aboutRoutes.js
  views/
    login.ejs
    reviews.ejs                 ← Review list + create/edit/delete modals
    reviewDetail.ejs            ← Single review full view
    navbar.ejs                  ← Session-aware navbar partial
  database/
    seedUsers.js                ← User seed script
  public/
    css/
    js/
    uploads/                    ← Media uploads (tracked via .gitkeep)
```