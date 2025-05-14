import multer from 'multer';
import { fileFilter } from './file-validation.js';

export const upload = multer({
  storage: multer.memoryStorage(), 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});