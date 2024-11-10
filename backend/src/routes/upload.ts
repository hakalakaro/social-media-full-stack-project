import express from 'express';
import { uploadImage } from '../controllers/upload';
import authMiddleware from '../middleware/authMiddleware';
import { uploadMiddleware } from '../controllers/upload'; // Use the new uploadMiddleware
import { getImages } from '../controllers/upload';

const router = express.Router();

// Define POST route for uploading
router.post('/', authMiddleware, uploadMiddleware, uploadImage);

router.get('/images', getImages); // This connects the GET request at /images to the getImages controller

export default router;