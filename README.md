# Canaanite Dress Try-On MVP

A minimal end-to-end demo for exploring Canaanite dress reconstructions. The Next.js frontend lets you upload a photo and pick a dress thumbnail; the Express backend currently echoes your upload as a placeholder while AI try-on is under construction.

## Project Structure
- `app/`: Next.js frontend.
- `server/`: Express API that handles uploads.
- `app/public/assets/dresses/`: Demo dress thumbnails served at `/assets/dresses/...`.
- `docs/`: Documentation and design notes.

## Prerequisites
- Node.js 18+ (npm 9+ recommended)

## Installation
Install all dependencies from the repository root:

```bash
npm install
```

Optionally create a local environment file (not required for the demo):

```bash
cp .env.example .env
```

## Running the demo
The fastest way to launch both the frontend (Next.js) and backend (Express) together is:

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

If you prefer separate terminals, run:

```bash
# Terminal 1
npm run start:server

# Terminal 2
npm run dev:app
```

## API (demo mode)
`POST /api/tryon`
- Form fields: `userImage` (file), `dressId` (string)
- Returns: JSON with `status: "Demo mode"`, the uploaded image as a data URL (`image`), and the echoed `dressId`.

## Building the frontend
```bash
npm run build:app
```

## Notes
- Dress thumbnails live in `app/public/assets/dresses` and load from `/assets/dresses` in the app. Supported extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`. Add files to that folder and they will automatically appear in the UI.
- The backend currently returns the uploaded photo unchanged as a demo placeholder.
