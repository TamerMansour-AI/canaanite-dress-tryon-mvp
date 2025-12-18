const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Canaanite Dress Try-On API proxy placeholder' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
