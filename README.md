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

For real try-on, set your OpenAI key in a local environment file. You can place it at the repository root or inside `server/.env`:

```bash
cp .env.example .env
```

Set `OPENAI_API_KEY` in `server/.env` for local development. For deployments/CI, store `OPENAI_API_KEY` as a GitHub Secret and expose it to the server runtime.

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

## API
`POST /api/tryon`
- Form fields: `userImage` (file), `dressId` (string), `dressSrc` (string, optional), `demoOverlay` ("true" | "false"), `demoMode` ("true" | "false")
- Returns: JSON with a base64 image data URL (`image`), status text, and the echoed dress info.

Demo overlay mode
- The default request adds a translucent dress overlay plus a subtle vignette and "DEMO" badge.
- Send `demoOverlay=false` to receive the original upload unchanged.
- The server automatically stays in demo mode if `demoMode=true` or if `OPENAI_API_KEY` is missing.

Real try-on (beta)
- Set `demoMode=false` **and** configure `OPENAI_API_KEY` to call OpenAI GPT Image 1.5 with the uploaded user photo (first image) and the selected dress (second image).
- The server returns `{ status: "real", image: <dataURL>, dressId }` on success and falls back to demo behavior when API credentials are absent.
- Real mode requires the toggle in the UI to be on and `OPENAI_API_KEY` to be present; otherwise, demo mode remains intact as a fallback.

## Building the frontend
```bash
npm run build:app
```

## Notes
- Dress thumbnails live in `app/public/assets/dresses` and load from `/assets/dresses` in the app. Supported extensions: `.jpg`, `.jpeg`, `.png`, `.webp`. Add files to that folder and they will automatically appear in the UI.
- Manual test: run `npm run dev`, upload a photo, select a dress, toggle "Demo overlay mode" on/off, and verify the overlay result looks visually distinct from the original upload and the dress preview matches the selection.
- Real try-on: place your `OPENAI_API_KEY` in `server/.env` or a root `.env`, enable "Real try-on (beta)" in the UI, then submit a photo + dress. The server will call OpenAI GPT Image 1.5 with the user image as the first input and the selected dress as the second. If credentials are missing, the API automatically falls back to demo mode.
