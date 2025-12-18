# Canaanite Dress Try-On MVP

This repository scaffolds an MVP for a Canaanite dress try-on experience with a Next.js frontend and a small Express proxy server.

## Project Structure
- `app/`: Next.js frontend scaffold.
- `server/`: Node/Express API proxy scaffold.
- `assets/dresses/`: Placeholder folder for reconstructed dress assets (kept empty aside from `.gitkeep`).
- `docs/`: Documentation and design notes.

## Getting Started
The repository uses npm workspaces to manage the frontend and server packages. Install dependencies from the root:

```bash
npm install --workspaces
```

### Running the frontend
```bash
npm run dev:app
```
The app defaults to `http://localhost:3000`.

### Running the server
```bash
npm run start:server
```
The proxy starts on `http://localhost:4000`.

### Building the frontend
```bash
npm run build:app
```

## Notes
- No real dress assets are included yet; add images to `assets/dresses/` when they are available.
- Update the docs in `docs/` as product and technical decisions evolve.
