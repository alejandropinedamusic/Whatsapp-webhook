const express = require('express');
const app = express();

app.use(express.json());

const VERIFY_TOKEN = "token123alejandro";

app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// Endpoint para recibir mensajes entrantes
app.post('/', (req, res) => {
  console.log('Mensaje recibido:', req.body);
  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => console.log('Server running'));
