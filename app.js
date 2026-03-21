// server.js
import express from "express";
import mongoose, { Schema } from "mongoose";
import session from "express-session";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const mongoURL = process.env.MONGO_URL;

const localURL = 'mongodb://127.0.0.1:27017/mydb';
// ===== Middleware =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public")); // serve your images, css, js etc. from public/

app.set("view engine", "ejs");

// ===== Session =====
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    httpOnly: true,
  }
}));

// ===== Auth Middleware =====
function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect('/login');
}

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

const projectSchema = new mongoose.Schema({
  projectname: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  urls: [String],
  githubLink: { type: String, trim: true, default: '' },
  workingLink: { type: String, trim: true, default: '' },
})

const Projects = mongoose.model("Projects", projectSchema);
const Contact = mongoose.model("Contact", contactSchema);

// ===== Routes =====
app.get("/", async (req, res) => {

  const projects = await Projects.find();



  res.render("index", { success: undefined, error: undefined, old: {}, projects: projects });
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

// ===== Auth Routes =====
app.get("/login", (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin-panel');
  }
  res.render("login", { error: undefined });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

  if (username === adminUser && password === adminPass) {
    req.session.isAdmin = true;
    return res.redirect('/admin-panel');
  }

  res.render("login", { error: "Invalid username or password" });
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Session destroy error:', err);
    res.redirect('/login');
  });
});

// ===== Admin Routes (Protected) =====
app.get("/admin-panel", requireAuth, async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    const projects = await Projects.find().sort({ _id: -1 });
    res.render("admin", { messages, projects });
  } catch (err) {
    console.error("❌ Error fetching admin data:", err);
    res.render("admin", { messages: [], projects: [], error: "Failed to fetch data." });
  }
});

app.post("/admin-panel", requireAuth, async (req, res) => {
  try {
    const { projectname, description, urls, githubLink, workingLink } = req.body;

    await Projects.create({
      projectname: projectname.trim(),
      description: description.trim(),
      urls: urls ? [urls.trim()].filter(u => u.length > 0) : [],
      githubLink: githubLink ? githubLink.trim() : '',
      workingLink: workingLink ? workingLink.trim() : '',
    });

    res.redirect("/admin-panel");
  } catch (err) {
    console.error("❌ Error creating project:", err);
    res.redirect("/admin-panel?error=creation_failed");
  }
});

// Update Project
app.post("/admin-panel/update/:id", requireAuth, async (req, res) => {
  try {
    const { projectname, description, urls, githubLink, workingLink } = req.body;
    await Projects.findByIdAndUpdate(req.params.id, {
      projectname: projectname.trim(),
      description: description.trim(),
      urls: urls ? [urls.trim()].filter(u => u.length > 0) : [],
      githubLink: githubLink ? githubLink.trim() : '',
      workingLink: workingLink ? workingLink.trim() : '',
    });
    res.redirect("/admin-panel");
  } catch (err) {
    console.error("❌ Error updating project:", err);
    res.redirect("/admin-panel?error=update_failed");
  }
});

// Delete Project
app.post("/admin-panel/delete-project/:id", requireAuth, async (req, res) => {
  try {
    await Projects.findByIdAndDelete(req.params.id);
    res.redirect("/admin-panel");
  } catch (err) {
    console.error("❌ Error deleting project:", err);
    res.redirect("/admin-panel");
  }
});

// Delete Message
app.post("/admin-panel/delete-message/:id", requireAuth, async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.redirect("/admin-panel");
  } catch (err) {
    console.error("❌ Error deleting message:", err);
    res.redirect("/admin-panel");
  }
});

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
