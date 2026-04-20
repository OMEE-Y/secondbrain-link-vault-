
<img width="1902" height="895" alt="linkvault" src="https://github.com/user-attachments/assets/e9b29b36-42ae-4480-bdeb-781a8ced9def" />

# Link Vault

A minimal full-stack application to save, organize, and manage useful links in one place. Built as a personal “second brain” to keep track of resources efficiently.

---

## Features

* User authentication using JWT
* Create, read, and delete links
* Tag-based organization
* Search and filter functionality
* Responsive and clean UI
* Secure backend with production-ready practices

---

## Tech Stack

### Frontend

* Next.js
* React
* Tailwind CSS
* Lucide Icons
* Phosphor Icons

### Backend

* Node.js
* Express.js
* MongoDB with Mongoose
* JWT for authentication
* bcrypt for password hashing

---

## Project Structure

```
/frontend   -> Next.js application
/server    -> Express server
```

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/OMEE-Y/secondbrain-link-vault-.git
cd secondbrain-link-vault-
```

---

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the backend folder:

```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=frontend url of mine/yours
```

Run the backend:

```bash
node index.js
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## API Endpoints

### Authentication

* `POST /register`
  Create a new user

* `POST /login`
  Authenticate user and return JWT

---

### Links

* `GET /links`
  Fetch all user links

* `POST /links`
  Add a new link

* `DELETE /links/:id`
  Delete a link

---

## Security Features

* Password hashing using bcrypt
* JWT-based authentication
* Rate limiting to prevent abuse
* MongoDB query sanitization
* HTTP header protection using Helmet
* Protection against parameter pollution

---

## Live Demo

[https://secondbrain-link-vault.vercel.app](https://secondbrain-link-vault.vercel.app)

---

## Future Improvements

* Update/edit links
* Folder or collection system
* Link previews using metadata
* Dark mode support
* Sharing links with others

---



