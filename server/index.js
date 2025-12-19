const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 4000;

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
  const shouldComposite = req.body?.demoOverlay !== 'false';

  if (!shouldComposite) {
    const imageBase64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;
    return res.json({
      status: 'Demo echo mode',
      image: dataUrl,
      dressId,
      dressSrc,
    });
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
      status: 'Demo overlay mode',
      image: dataUrl,
      dressId,
      dressSrc,
    });
  } catch (error) {
    console.error('Error compositing demo overlay', error);
    const imageBase64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;
    return res.status(200).json({
      status: 'Demo fallback (echo)',
      image: dataUrl,
      dressId,
      dressSrc,
      error: 'Overlay failed, returning original upload.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
