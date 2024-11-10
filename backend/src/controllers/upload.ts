import { Request, Response } from 'express';
import multer from 'multer';
import { Post } from '../models/post';
import path from 'path';
 
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
        if (!req.file) {
            res.status(400).send('No file uploaded.');
            return;
        }
        
        const post = new Post({
            imageUrl: req.file.path,
        });
        await post.save();

        res.status(200).json({ message: 'Image uploaded successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Upload failed', error });
    }
};

// Controller function to fetch images
export const getImages = async (req: Request, res: Response): Promise<void> => {
    try {
        const posts = await Post.find({}, 'imageUrl');
        const imagesWithPaths = posts.map(post => {
            const imageUrl = post.imageUrl.replace(/\\/g, '/'); 
            return { imageUrl };
        });

        res.json(imagesWithPaths);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching images', error });
    }
};

// Export the multer middleware as a separate function
export const uploadMiddleware = upload.single('image');