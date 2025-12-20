import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPaths = [path.join(__dirname, '.env'), path.join(__dirname, '..', '.env')];
envPaths.forEach((envPath) => {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
});

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 4000;
const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);
const openaiClient = hasOpenAiKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const dressesDir = path.resolve(path.join(__dirname, '..', 'app', 'public', 'assets', 'dresses'));
const allowedDressExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Canaanite Dress Try-On API proxy placeholder' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/tryon', upload.single('userImage'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: 'No user image provided', code: 'missing_user_image' });
  }

  const dressId = req.body?.dressId;
  const dressSrc = req.body?.dressSrc;
  const demoMode = req.body?.demoMode === 'true';
  const shouldComposite = req.body?.demoOverlay !== 'false';
  const isDemoMode = demoMode || !openaiClient;

  const echoUpload = (status) => {
    const imageBase64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;
    return res.json({
      status,
      image: dataUrl,
      dressId,
      dressSrc,
    });
  };

  const isPathInside = (filePath, parentDir) => {
    const relative = path.relative(parentDir, filePath);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  };

  const findDressPathById = () => {
    if (!dressId) return { path: null };
    if (!/^[a-zA-Z0-9_-]+$/.test(dressId)) {
      return { path: null, error: 'Invalid dress id', code: 'invalid_dress_id' };
    }

    for (const ext of allowedDressExtensions) {
      const candidate = path.resolve(path.join(dressesDir, `${dressId}${ext}`));
      if (!isPathInside(candidate, dressesDir)) {
        return { path: null, error: 'Invalid dress path', code: 'invalid_dress_path' };
      }

      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return { path: candidate };
      }
    }

    return { path: null };
  };

  const findDressPathBySrc = () => {
    if (!dressSrc) return { path: null };
    if (dressSrc.includes('..') || dressSrc.includes('\\')) {
      return { path: null, error: 'Invalid dress path', code: 'invalid_dress_path' };
    }

    const normalizedDressSrc = dressSrc.startsWith('/') ? dressSrc.slice(1) : dressSrc;
    const normalizedPath = path.normalize(normalizedDressSrc);
    const candidate = path.resolve(path.join(__dirname, '..', 'app', 'public', normalizedPath));

    if (!isPathInside(candidate, dressesDir)) {
      return { path: null, error: 'Invalid dress path', code: 'invalid_dress_path' };
    }

    if (!allowedDressExtensions.has(path.extname(candidate).toLowerCase())) {
      return { path: null, error: 'Unsupported dress extension', code: 'invalid_dress_ext' };
    }

    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return { path: candidate };
    }

    return { path: null };
  };

  if (isDemoMode) {
    if (!shouldComposite) {
      return echoUpload('Demo echo mode');
    }

    try {
      const userImageBuffer = req.file.buffer;
      const metadata = await sharp(userImageBuffer).metadata();
      const baseWidth = metadata.width || 1024;
      const baseHeight = metadata.height || 1024;

      const baseImage = sharp(userImageBuffer).ensureAlpha();

      let overlayBuffer = null;
      if (dressSrc) {
        const normalizedDressSrc = dressSrc.startsWith('/') ? dressSrc.slice(1) : dressSrc;
        const dressPath = path.join(__dirname, '..', 'app', 'public', normalizedDressSrc);
        if (fs.existsSync(dressPath)) {
          overlayBuffer = await sharp(dressPath).ensureAlpha().toBuffer();
        }
      }

      const compositeLayers = [];

      if (overlayBuffer) {
        const overlayWidth = Math.max(180, Math.round(baseWidth * 0.6));
        const overlayHeight = Math.max(180, Math.round(baseHeight * 0.6));
        const resizedOverlay = await sharp(overlayBuffer)
          .resize({ width: overlayWidth, height: overlayHeight, fit: 'inside' })
          .ensureAlpha()
          .toBuffer();

        compositeLayers.push({
          input: resizedOverlay,
          gravity: 'center',
          blend: 'over',
          opacity: 0.35,
        });
      }

      const vignetteSvg = Buffer.from(
        `<svg width="${baseWidth}" height="${baseHeight}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
              <stop offset="50%" stop-color="rgba(0,0,0,0)" />
              <stop offset="100%" stop-color="rgba(0,0,0,0.22)" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#vignette)" />
        </svg>`
      );

      compositeLayers.push({ input: vignetteSvg, blend: 'multiply' });

      const badgeSvg = Buffer.from(
        `<svg width="200" height="80" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
          <rect x="110" y="34" width="80" height="32" rx="8" fill="rgba(37,99,235,0.85)" />
          <text x="150" y="55" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="white">DEMO</text>
        </svg>`
      );

      compositeLayers.push({ input: badgeSvg, gravity: 'southeast' });

      const outputBuffer = await baseImage
        .composite(compositeLayers)
        .jpeg({ quality: 90 })
        .toBuffer();

      const dataUrl = `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;

      return res.json({
        status: !openaiClient ? 'Demo overlay mode (API key missing)' : 'Demo overlay mode',
        image: dataUrl,
        dressId,
        dressSrc,
      });
    } catch (error) {
      console.error('Error compositing demo overlay', error);
      return res.status(200).json({
        status: 'Demo fallback (echo)',
        image: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
        dressId,
        dressSrc,
        error: 'Overlay failed, returning original upload.',
      });
    }
  }

  const resolvedById = findDressPathById();
  if (resolvedById?.error) {
    return res.status(400).json({ ok: false, error: resolvedById.error, code: resolvedById.code });
  }

  const resolvedBySrc = !resolvedById.path ? findDressPathBySrc() : { path: null };
  if (resolvedBySrc?.error) {
    return res.status(400).json({ ok: false, error: resolvedBySrc.error, code: resolvedBySrc.code });
  }

  const resolvedDressPath = resolvedById.path || resolvedBySrc.path;
  let dressBuffer = null;

  if (resolvedDressPath && fs.existsSync(resolvedDressPath)) {
    dressBuffer = await fs.promises.readFile(resolvedDressPath);
  }

  if (!resolvedDressPath || !dressBuffer) {
    return res
      .status(400)
      .json({ ok: false, error: 'Dress image not found for real try-on', code: 'dress_not_found', dressId });
  }

  if (!req.file?.buffer?.length) {
    return res.status(400).json({ ok: false, error: 'User image missing or empty', code: 'missing_user_image' });
  }

  if (!dressBuffer?.length) {
    return res.status(400).json({ ok: false, error: 'Dress image is empty', code: 'empty_dress_image', dressId });
  }

  try {
    const userFile = await toFile(req.file.buffer, req.file.originalname || 'user.png');
    const dressFilename =
      (dressSrc && path.basename(dressSrc)) || (dressId ? `${dressId}.png` : 'dress.png');
    const dressFile = await toFile(dressBuffer, dressFilename);

    const response = await openaiClient.images.edit({
      model: 'gpt-image-1.5',
      image: [userFile, dressFile],
      prompt:
        'Replace the outfit in the user photo with the dress from the dress image while keeping the same person identity, body proportions, pose, and background. Match fabric, seams, silhouette. Realistic lighting and shadows. No extra logos or text.',
      response_format: 'b64_json',
    });

    const base64Image = response?.data?.[0]?.b64_json;

    if (!base64Image) {
      return res.status(502).json({ ok: false, error: 'No image returned from OpenAI', code: 'no_image' });
    }

    return res.json({
      status: 'real',
      image: `data:image/jpeg;base64,${base64Image}`,
      dressId,
    });
  } catch (error) {
    const requestId = error?.response?.headers?.['x-request-id'] || error?.response?.headers?.['x-requestid'];
    const status = error?.status || error?.response?.status;
    console.error('Error calling OpenAI image edit', {
      status,
      code: error?.code,
      message: error?.message,
      request_id: requestId,
      stack: error?.stack,
    });
    return res.status(502).json({
      ok: false,
      error: error?.message || 'Failed to generate real try-on with OpenAI',
      code: error?.code || status || 'openai_error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
