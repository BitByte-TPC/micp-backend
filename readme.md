# MICP's Backend

This is the backend repository for the Most Improved Competitive Programmer.

## Tech Stack

**Server:** NodeJs, ExpressJS, For Croning Job: `node-cron`

## How to Contribute

- Fork the repository

- Clone the forked repository

```bash
  git clone https://github.com/<your-username>/micp-backend
```

- Go to the project directory

```bash
  cd micp-backend
```

- Install dependencies

```bash
  npm install
```

- Add Environment Variables by creating `.env` file in root directory with the following variables

```bash
MONGO_DATABASE_DEV=<your-mongodb-database-uri>
```

- Start the server

```bash
  npm run start
```
