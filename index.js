const express = require("express");
const OpenAI = require("openai");
const axios = require("axios");

const app = express();
app.use(express.json());

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Variables de entorno
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Verificación del webhook (Meta)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verificado correctamente");
      return res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Recibir mensajes
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (
      body.object &&
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;
      const text = message.text?.body;

      if (!text) {
        console.log("Mensaje sin texto recibido, ignorado.");
        return res.sendStatus(200);
      }

      console.log("Mensaje recibido:", text);

      // Generar respuesta con OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres un asistente útil y amigable." },
          { role: "user", content: text },
        ],
      });

      const aiResponse = completion.choices[0].message.content;

      // Enviar respuesta a WhatsApp API
      await axios.post(
        `https://graph.facebook.com/v24.0/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: from,
          text: { body: aiResponse },
        },
        {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Siempre respondemos 200 OK a Meta para confirmar recepción
    res.sendStatus(200);
  } catch (error) {
    console.error("Error en webhook:", error);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
