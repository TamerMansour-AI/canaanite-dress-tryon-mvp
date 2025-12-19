import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import { OpenAI } from 'openai';
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
    return res.status(400).json({ error: 'No user image provided' });
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

  const findDressPathById = () => {
    if (!dressId) return null;
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    for (const ext of allowedExtensions) {
      const candidate = path.join(
        __dirname,
        '..',
        'app',
        'public',
        'assets',
        'dresses',
        `${dressId}${ext}`
      );
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    return null;
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

  const resolvedDressPath = findDressPathById();
  let dressBuffer = null;

  if (resolvedDressPath && fs.existsSync(resolvedDressPath)) {
    dressBuffer = await fs.promises.readFile(resolvedDressPath);
  } else if (dressSrc) {
    const normalizedDressSrc = dressSrc.startsWith('/') ? dressSrc.slice(1) : dressSrc;
    const normalizedDressPath = path.join(__dirname, '..', 'app', 'public', normalizedDressSrc);
    if (fs.existsSync(normalizedDressPath)) {
      dressBuffer = await fs.promises.readFile(normalizedDressPath);
    }
  }

  if (!dressBuffer) {
    return res.status(400).json({ error: 'Dress image not found for real try-on', dressId });
  }

  if (!req.file?.buffer?.length) {
    return res.status(400).json({ error: 'User image missing or empty' });
  }

  if (!dressBuffer?.length) {
    return res.status(400).json({ error: 'Dress image is empty', dressId });
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
        'Preserve the person’s identity, face, skin tone, and body proportions. ' +
        'Replace clothing only with the selected dress (copy its texture, embroidery, and silhouette). ' +
        'Keep the background and lighting consistent with the original photo.',
      output_format: 'jpeg',
      size: 'auto',
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
    console.error('Error calling OpenAI image edit', {
      status: error?.status,
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
    });
    return res.status(502).json({
      ok: false,
      error: error?.message || 'Failed to generate real try-on with OpenAI',
      code: error?.code || error?.status || 'openai_error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
