# Canaanite Dress Try-On MVP

A minimal end-to-end demo for exploring Canaanite dress reconstructions. The Next.js frontend lets you upload a photo and pick a dress thumbnail; the Express backend creates a lightweight overlay blend as a placeholder while AI try-on is under construction.

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
- Form fields: `userImage` (file), `dressId` (string), `dressSrc` (string, optional), `demoOverlay` ("true" | "false")
- Returns: JSON with a demo image data URL (`image`), status text, and the echoed dress info.

Demo overlay mode
- The default request adds a translucent dress overlay plus a subtle vignette and "DEMO" badge.
- Send `demoOverlay=false` to receive the original upload unchanged.

## Building the frontend
```bash
npm run build:app
```

## Notes
- Dress thumbnails live in `app/public/assets/dresses` and load from `/assets/dresses` in the app. Supported extensions: `.jpg`, `.jpeg`, `.png`, `.webp`. Add files to that folder and they will automatically appear in the UI.
- Manual test: run `npm run dev`, upload a photo, select a dress, toggle "Demo overlay mode" on/off, and verify the overlay result looks visually distinct from the original upload and the dress preview matches the selection.
