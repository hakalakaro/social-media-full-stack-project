import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload'; // Ensure this is correct
import path from 'path';
import { getImages } from './controllers/upload';

dotenv.config(); // It's okay here, at the top

const app = express();

// Middleware to log requests
app.use((req, res, next) => {
    console.log(`${req.method} request for '${req.url}'`);
    next();
});

// CORS setup
app.use(cors({
  origin: '*', // Adjust if needed for security
  methods: ['GET', 'POST'],
  allowedHeaders: ['Authorization', 'Content-Type']
}));

// Middleware for JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Make sure to include this if you're sending form data

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || "")
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// Routes
app.use('/auth', authRoutes);
app.use('/upload', uploadRoutes); // Adjust the prefix as necessary

// Custom route for getting images (if implemented in controller)
app.get('/upload/images', (req, res) => {
    console.log('Image request received');
    getImages(req, res);
});

// Serve static files for uploads
app.use('/uploads', express.static('uploads'));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));