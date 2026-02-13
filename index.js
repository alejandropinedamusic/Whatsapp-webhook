const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Variables de entorno (agrega estas en Render)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;        // token de verificación webhook
const AGENT_ID = process.env.AGENT_ID;                // tu Agent Builder ID
const AGENT_KEY = process.env.AGENT_KEY;              // tu API Key de Agent Builder
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;  // WhatsApp API phone number ID
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;        // WhatsApp API access token

// Verificación del webhook
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

// Función para enviar mensaje a Agent Builder
async function enviarAMiAgente(mensaje, senderId) {
  try {
    const response = await axios.post(
      'https://api.agentbuilder.com/v1/message', // reemplaza con tu endpoint real
      { agent_id: AGENT_ID, message: mensaje, sender_id: senderId },
      { headers: { 'Authorization': `Bearer ${AGENT_KEY}` } }
    );
    return response.data.reply;
  } catch (err) {
    console.error('Error enviando a Agent Builder:', err);
    return "Lo siento, hubo un error.";
  }
}

// Función para enviar respuesta a WhatsApp
async function enviarAWhatsApp(to, mensaje) {
  try {
    await axios.post(
      `https://graph.facebook.com/v16.0/${PHONE_NUMBER_ID}/messages`,
      { messaging_product: "whatsapp", to: to, text: { body: mensaje } },
      { headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error enviando a WhatsApp:', err);
  }
}

// Endpoint principal para recibir mensajes
app.post('/', async (req, res) => {
  const senderId = req.body.from || req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
  const mensaje = req.body.text?.body || req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body;

  if (senderId && mensaje) {
    console.log('Mensaje recibido:', mensaje);
    const respuesta = await enviarAMiAgente(mensaje, senderId);
    await enviarAWhatsApp(senderId, respuesta);
  }

  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => console.log('Server running'));
