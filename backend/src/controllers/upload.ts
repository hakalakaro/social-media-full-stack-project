import { Request, Response } from 'express';
import multer from 'multer';
import { Post } from '../models/post';
import path from 'path';
import jwt from 'jsonwebtoken';
// File filter for allowed image types (jpg, jpeg, png)
const fileFilter = (req: Request, file: Express.Multer.File, cb: Function) => {
    const allowedTypes = /jpg|jpeg|png/;
    const mimeType = allowedTypes.test(file.mimetype);
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    // Log the file's MIME type and extension for debugging
    console.log("File MIME Type: ", file.mimetype);
    console.log("File Extension: ", path.extname(file.originalname));

    if (mimeType && extName) {
        return cb(null, true); // Allow the file to be uploaded
    } else {
        console.log("File rejected: Invalid type"); // Log the rejected file
        return cb(new Error('Invalid file type. Only jpg, jpeg, and png are allowed.'));
    }
};

// Configure multer for storing images
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

// Initialize multer with file validation
const upload = multer({
    storage,
    fileFilter
});

// Create the uploadImage function
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extract the token from the request header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            console.error('No token provided');
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Decode the token using your secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { username: string };
        console.log('Extracted Username:', decoded.username); // Log the username

        if (!req.file) {
            res.status(400).send('No file uploaded.');
            return;
        }

        // Log the uploaded file details
        console.log(`Image uploaded by user: ${decoded.username}`);

        const post = new Post({
            imageUrl: req.file.path,
            username: decoded.username, // Optionally save the username with the post
        });

        await post.save();
        res.status(200).json({ message: 'Image uploaded successfully' });
    } catch (error) {
        console.error('Upload failed:', error);
        res.status(500).json({ message: 'Upload failed', error });
    }
};

// Controller function to fetch images
export const getImages = async (req: Request, res: Response): Promise<void> => {
    try {
        const posts = await Post.find({}, 'imageUrl username _id');
        console.log('Fetched Posts:', posts);
        const imagesWithPaths = posts.map(post => {
            const imageUrl = post.imageUrl.replace(/\\/g, '/');
            const username = post.username || 'Anonymous'
            const _id = post._id;
            return { imageUrl, username, _id };
        });

        res.json(imagesWithPaths);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching images', error });
    }
};

// Export the multer middleware as a separate function
export const uploadMiddleware = upload.single('image');