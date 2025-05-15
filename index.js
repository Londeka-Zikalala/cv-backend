import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { upload } from './service/upload.js';
import sanitizeHtml from 'sanitize-html';
import { uploadFile } from './service/cloudinary.js';
import rateLimit from 'express-rate-limit';
import {db,pgp} from './db.js';

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
    'http://localhost:5173'
  ],
  methods: ['POST']
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  
const sanitizeInput = (str) => sanitizeHtml(str, { allowedTags: [], allowedAttributes: {} });

app.post('/api/upload', upload.single('file'), async (req, res) => {
    console.log('Headers:', req.headers['content-type']);
    console.log('Files:', req.file);
    console.log('Body:', req.body);
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
        console.error('Cloudinary upload error:', err);
        return res.status(500).json({ message: 'File upload failed' });
      }
    }
  console.log(sanitizedName, sanitizedEmail, sanitizedOption, sanitizedDescription, fileUrl)
  try{
  await db.tx(async t => {
    const query = pgp.as.format(
      `INSERT INTO requests 
      (name, email, package_type, description, file_url)
      VALUES ($<name>, $<email>, $<option>, $<description>, $<fileUrl>)
      RETURNING id`,
      {
        name: sanitizeInput(name),
        email: sanitizeInput(email),
        option: sanitizeInput(option),
        description: sanitizeInput(description),
        fileUrl: fileUrl || null
      }
    );

    const result = await t.one(query);
    console.log('Insert successful, ID:', result.id);
  });

  res.status(200).json({ message: 'Request submitted successfully' });
  
} catch (error) {
  console.error('Transaction error:', error);
  const errorMessage = error.message || 'Database operation failed';
  res.status(500).json({ 
    message: errorMessage,
    detail: error.detail,
    code: error.code
  });
}
  });
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});