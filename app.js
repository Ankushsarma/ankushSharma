// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const mongoURL = process.env.MONGO_URL ;
// ===== Middleware =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public")); // serve your images, css, js etc. from public/

app.set("view engine", "ejs");

// --- Mongoose Connection ---
mongoose.connect(mongoURL, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log('✅ Database connected'))
  .catch(err => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  });
// ===== Contact Schema =====
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

const Contact = mongoose.model("Contact", contactSchema);

// ===== Routes =====
app.get("/", (req, res) => {
  res.render("index", { success: undefined, error: undefined, old: {} });
});

app.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.render("index", {
        error: "⚠️ All fields are required!",
        success: undefined,
        old: { name, email, message },
      });
    }

    await Contact.create({ name, email, message });

    res.render("index", {
      success: "✅ Message sent successfully!",
      error: undefined,
      old: {},
    });
  } catch (err) {
    console.error("❌ Error saving contact:", err);
    res.render("index", {
      error: "❌ Internal server error. Please try again later.",
      success: undefined,
      old: req.body,
    });
  }
});

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
