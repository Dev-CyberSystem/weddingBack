import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import pkg from 'whatsapp-web.js';  // Importar el paquete de la manera correcta
import qrcode from 'qrcode-terminal';

const { Client, LocalAuth } = pkg;

dotenv.config();

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Conexión a MongoDB
mongoose.connect("mongodb://localhost:27017/wedding");

const db = mongoose.connection;
db.once("open", () => console.log("Connected to MongoDB"));

// Modelo de Invitado
const guestSchema = new mongoose.Schema({
  name: String,
  phone: String,
  confirmationCode: String,
  confirmed: { type: Boolean, default: false },
});

const Guest = mongoose.model("Guest", guestSchema);

// Ruta para registrar un invitado
app.post("/api/invite", async (req, res) => {
  const { name, phone } = req.body;
  const confirmationCode = generateUniqueCode();
  const newGuest = new Guest({ name, phone, confirmationCode });

  await newGuest.save();

  console.log(`Invitation code for ${name}: ${confirmationCode}`);
  sendWhatsAppInvitation(phone, confirmationCode); // Llama a la función para enviar el mensaje de WhatsApp

  res.json({ message: "Invitation sent" });
});

// Ruta para confirmar asistencia
app.get("/api/confirm/:code", async (req, res) => {
  const { code } = req.params;
  const guest = await Guest.findOneAndUpdate(
    { confirmationCode: code },
    { confirmed: true },
    { new: true }
  );

  if (guest) {
    res.json({ message: "Asistencia confirmada!!" });
  } else {
    res.status(404).json({ message: "Invalid code" });
  }
});

// Ruta para obtener la lista de confirmados
app.get("/api/confirmed", async (req, res) => {
  const confirmedGuests = await Guest.find({ confirmed: true });
  res.json(confirmedGuests);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

function generateUniqueCode() {
  return Math.random().toString(36).substr(2, 9);
}

// Función para enviar la invitación por WhatsApp
// function sendWhatsAppInvitation(phone, code) {
//   const text = `Estas invitado a nuestra boda. Por favor hace click en este link para confirmar tu asistencia: https://boda-dai-juan.netlify.app/confirmacion/${code}`;

//   client.sendMessage(`${phone}@c.us`, text)
//     .then(response => {
//       console.log('Message sent:', response.id._serialized);
//     })
//     .catch(err => {
//       console.error('Failed to send message:', err);
//     });
// }
function sendWhatsAppInvitation(phone, code) {
  const text = `Estas invitado a nuestra boda. Por favor hace click en este link para confirmar tu asistencia: https://boda-dai-juan.netlify.app/confirmacion/${code}`;

  // Formatear el número a E.164 si no está ya formateado
  if (!phone.startsWith('+')) {
    phone = `549${phone}`; // Ejemplo: Argentina, cambia según el país
  }

  client.sendMessage(`${phone}@c.us`, text)
    .then(response => {
      console.log('Message sent:', response.id._serialized);
    })
    .catch(err => {
      console.error('Failed to send message:', err);
    });
}

const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.initialize();
