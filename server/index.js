const express = require('express');
const cors = require('cors');
const multer = require('multer');

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

app.post('/api/tryon', upload.single('userImage'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No user image provided' });
  }

  const imageBase64 = req.file.buffer.toString('base64');
  const dataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;
  const dressId = req.body?.dressId;
  const dressSrc = req.body?.dressSrc;

  res.json({
    status: 'Demo mode',
    image: dataUrl,
    dressId,
    dressSrc,
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
