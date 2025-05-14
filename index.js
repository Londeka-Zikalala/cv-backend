import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { upload } from './service/upload.js';
import pool from './db.js';
import sanitizeHtml from 'sanitize-html';
import { uploadFile } from './service/cloudinary.js';
import rateLimit from 'express-rate-limit';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(limiter);
app.use(cors({
  origin: [
    'https://cvrefine.netlify.app/',
    'http://localhost:3000'
  ],
  methods: ['POST']
}));
app.use(helmet());
app.use(express.json());

const sanitizeInput = (str) => sanitizeHtml(str, { allowedTags: [], allowedAttributes: {} });

app.post('/api/upload', upload.single('file'), async (req, res) => {
  // Handle file filter errors
 
  if (req.fileValidationError) {
    return res.status(400).json({ message: req.fileValidationError.message });
  }
  const { name, email, option, description } = req.body;
  const file = req.file;

  // Sanitize inputs
  const sanitizedName = sanitizeInput(name);
  const sanitizedEmail = sanitizeInput(email);
  const sanitizedOption = sanitizeInput(option);
  const sanitizedDescription = sanitizeInput(description);

  // Validation
  if (!sanitizedName || !sanitizedEmail) {
    return res.status(400).json({ message: 'Please fill in your name and email.' });
  }

  if (!file && !sanitizedDescription) {
    return res.status(400).json({ message: 'Please upload a file or describe what you need.' });
  }

  let fileUrl;
  if (file) {
    try {
      fileUrl = await uploadFile(file.buffer);
    } catch (err) {
      return res.status(500).json({ message: 'File upload failed' });
    }
  }

  try {
    // Use SANITIZED values in query
    await pool.query(
      `INSERT INTO requests 
       (name, email, package_type, description, file_url)
       VALUES ($1, $2, $3, $4, $5)`,
      [sanitizedName, sanitizedEmail, sanitizedOption, sanitizedDescription, fileUrl]
    );
    res.status(200).json({ message: 'Success!' });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});