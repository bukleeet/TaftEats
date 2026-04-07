# TaftEats – Restaurant Review Web App

A Node.js/Express/MongoDB web application for reviewing restaurants around the DLSU Taft campus.

> **Live deployment:** The app is already [live and fully functional](https://taft-eats.vercel.app/) on Vercel. The setup instructions below are for running a local copy.

---

## Prerequisites

- Node.js v18 or later
- A MongoDB connection (The live Vercel deployment and default environment variables use a live **MongoDB Atlas** cloud cluster)

---

## Environment Variables

Create a `.env` file in the project root with the following keys before starting the server. 
A `.env.example` file is included in the repository with placeholder values.

```env
# Although the project uses a live Atlas URI, localhost works in place of Atlas
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/myDatabase?retryWrites=true&w=majority
SESSION_SECRET=replace_with_any_long_random_string
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

> **Note:** The live Vercel deployment uses real credentials configured as Vercel environment variables.
> For local development, a free [Cloudinary](https://cloudinary.com/) account is sufficient.
> Profile pictures and review images are uploaded there instead of being stored on disk.

---

## Setup & Installation

### 1. Install dependencies

```bash
npm install
```

**Important notes on packages:**
- **No bcrypt**: password hashing uses Node's built-in `crypto` module (HMAC-SHA256 + random salt + `timingSafeEqual`)
- **No dompurify/jsdom**: server-side HTML sanitization uses a regex tag whitelist in `reviewController.js`

### 2. Connect to the Database
Since the application uses a live MongoDB Atlas cluster, you do not need to start a local MongoDB service. Just ensure your `.env` file contains the correct live `MONGO_URI`.

### 3. Create the Database (If starting from scratch)
Open MongoDB Compass, paste your live Atlas connection string (from your `.env`), and create a database named `myDatabase` with an initial collection named `establishments`.

### 4. Seed user accounts

Run this from the project root **first**, before seeding establishments and reviews:

```bash
node database/seedUsers.js
```

This prints all available login credentials to the console.

### 5. Seed establishments and reviews

> **Optional but recommended:** To populate the app with sample establishments and reviews, you can use MongoDB Compass connected to your Atlas cluster.
>
> 1. Open MongoDB Compass and connect using your Atlas URI (the same `MONGO_URI` from your `.env`)
> 2. Select the `myDatabase` database
> 3. Open the **Compass shell** (the `>_` button at the bottom of the sidebar)
> 4. Paste and run the full contents of `database/seed.js`
>
> This must be run **after step 4** because the reviews reference user ObjectIds created by the user seed. Skip this step if you prefer to start with an empty database.

---

### 6. Start the server

```bash
node app.js
```

Or with auto-reload on file changes (requires nodemon):

```bash
npm run dev
# or directly:
npx nodemon app.js
```

App runs at http://localhost:3000

---

## Login Credentials

### Student Accounts

| Username   | Password      | Email                    |
|------------|---------------|--------------------------|
| `jane_d`   | `password123` | jane.d@dlsu.edu.ph       |
| `marky`    | `password123` | marky@dlsu.edu.ph        |
| `ella_s`   | `password123` | ella.s@dlsu.edu.ph       |
| `miggy`    | `password123` | miggy@dlsu.edu.ph        |
| `kiks_m`   | `password123` | kiks.m@dlsu.edu.ph       |
| `sophia`   | `password123` | sophia@dlsu.edu.ph       |
| `daniella` | `password123` | daniella@dlsu.edu.ph     |
| `carlos_r` | `password123` | carlos.r@dlsu.edu.ph     |
| `bea_t`    | `password123` | bea.t@dlsu.edu.ph        |
| `lance_v`  | `password123` | lance.v@dlsu.edu.ph      |
| `trisha_m` | `password123` | trisha.m@dlsu.edu.ph     |
| `pau_g`    | `password123` | pau.g@dlsu.edu.ph        |

### Owner Accounts

| Username           | Password            | Email                     | Establishment     |
|--------------------|---------------------|---------------------------|-------------------|
| `owner_prelude`    | `OwnerPrelude#1`    | owner@prelude.com         | Prelude           |
| `owner_barn`       | `OwnerBarn#1`       | owner@barnbyborro.com     | Barn by Borro     |
| `owner_callecafe`  | `OwnerCalle#1`      | owner@callecafe.com       | Calle Cafe        |
| `owner_angrydobo`  | `OwnerAngry#1`      | owner@angrydobo.com       | Angrydobo         |
| `owner_laelotes`   | `OwnerLaElotes#1`   | owner@laelotes.com        | La Elotes         |
| `owner_asterisko`  | `OwnerAsterisko#1`  | owner@asterisko.com       | Asterisko         |
| `owner_kuhmeal`    | `OwnerKuhMeal#1`    | owner@kuhmeal.com         | KuhMeal           |
| `owner_ganggang`   | `OwnerGangGang#1`   | owner@ganggangchicken.com | Gang Gang Chicken |
| `owner_illo`       | `OwnerIllo#1`       | owner@illo.com            | Illo              |
| `owner_dapithapon` | `OwnerDapit#1`      | owner@dapithapon.com      | Dapit-Hapon Cafe  |

Owner accounts are tied to their respective establishments. They can only respond to reviews on their own establishment.

---

## Notable Features Implemented

### Login / Logout
- `POST /login` — authenticates via crypto-based password verification, creates a session
- "Remember Me" extends the session cookie to 3 weeks; unchecked = session-only cookie cleared on browser close
- `POST /logout` — destroys session and clears cookie

### Create a Review
- Only logged-in users can post reviews
- Required fields: title, body (rich text), star rating (1–5)
- Optional: media attachment (image or video, up to 20 MB)
- Body is sanitized server-side with a regex tag whitelist to prevent XSS
- Both front-end (JS alerts + `required` attributes) and back-end (controller-level checks) validation are implemented
- Route: `POST /reviews`

### Edit / Delete a Review (CRUD requirement)
- Only the review's author can edit or delete their own review
- Edited reviews display an "(edited)" label
- Routes: `PUT /reviews/:reviewId`, `DELETE /reviews/:reviewId`

### Mark as Helpful / Unhelpful
- Logged-in users can vote once per review
- Voting the same type again removes the vote
- Voting the opposite type switches the vote automatically
- Route: `POST /reviews/:reviewId/vote`

### Establishment Owner Response
- Owner accounts are created via `database/seedUsers.js`
- Each owner is tied to one establishment via `ownedEstablishment`
- Owners can respond to reviews only on their own establishment
- Owner response is sanitized and displayed publicly below the review
- Owners can delete their own response
- Routes: `POST /reviews/:reviewId/owner-response`, `DELETE /reviews/:reviewId/owner-response`

### User Profiles
- All users have a profile page showing their recent activity, reviews, and replies
- Profile owners can edit their username, description, and avatar
- Account deletion removes the user and all associated reviews

---

## Project Structure

```
app.js                              ← Entry point; express-session, connect-mongo,
                                      res.locals.sessionUser middleware, route mounting
sampleEnv.txt                       ← Placeholder env vars — copy to .env and fill in values
database/
  seedUsers.js                      ← Seeds 12 student + 10 owner accounts with hashed passwords;
                                      run with: node database/seedUsers.js
  seed.js                           ← Seeds establishments and reviews with correct schema;
                                      paste into Compass shell (select myDatabase first)
src/
  controllers/
    authController.js               ← GET /login, POST /login (remember-me logic), POST /logout
    reviewController.js             ← Full review CRUD + helpful/unhelpful vote toggle +
                                      owner respond/delete; includes regex HTML sanitizer +
                                      back-end field validation
    establishmentController.js      ← Establishment listing and detail
    profileController.js            ← Profile view, edit (with Cloudinary upload), delete account
    registerController.js           ← Registration with back-end field + email validation
    aboutController.js              ← About page
  models/
    users.js                        ← User schema: student | owner roles, ownedEstablishment ref,
                                      HMAC-SHA256 password hashing via pre-save hook
    reviews.js                      ← Review schema: helpfulVotes[], unhelpfulVotes[],
                                      responseThread subdoc, media URLs, virtual counts
    establishments.js               ← Establishment schema
    about.js                        ← About schema
  routes/
    authRoutes.js                   ← GET /login, POST /login, POST /logout
    reviewRoutes.js                 ← All review endpoints; multer memory storage → Cloudinary
    establishmentRoutes.js          ← Establishment routes
    profileRoutes.js                ← Profile routes with multer upload handling
    registerRoutes.js               ← Registration route with multer upload handling
    aboutRoutes.js                  ← About routes
  views/
    login.ejs                       ← Login form with remember-me checkbox; shows session errors
    register.ejs                    ← Multi-step registration form with profile image modal
    reviews.ejs                     ← Review list per establishment; create/edit/delete modals;
                                      helpful/unhelpful buttons; owner respond UI; search filter
    reviewDetail.ejs                ← Single review full view with edit modal, vote buttons,
                                      owner response section
    viewProfile.ejs                 ← Profile page with tabbed activity feed
    editProfile.ejs                 ← Profile edit form with avatar upload
    navbar.ejs                      ← Session-aware navbar; shows username + logout when logged in,
                                      login + register buttons when logged out
    establishments.ejs              ← Establishment listing
    about.ejs                       ← About page
  public/
    css/
      style.css                     ← Main stylesheet
      alert.css                     ← Alert/error banner styles
      profileEdit-style.css
      profileView-style.css
      register-page-style.css
    js/
      theme-toggle.js               ← Dark/light mode toggle (persisted via localStorage)
      profileEdit-script.js         ← Profile edit form handling + image preview
      profileView-script.js         ← Tabbed activity feed + review/reply card rendering
      register-script.js            ← Registration form + modal + front-end validation
```