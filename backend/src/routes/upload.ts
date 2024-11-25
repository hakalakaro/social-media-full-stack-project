import express from 'express';
import { uploadImage } from '../controllers/upload';
import authMiddleware from '../middleware/authMiddleware';
import { uploadMiddleware } from '../controllers/upload'; // Use the new uploadMiddleware
import { getImages } from '../controllers/upload';
import {addComment} from '../controllers/upload';
import { likePost } from '../controllers/upload';
import  User  from '../models/User'; // Make sure to import User model
import { Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Post } from '../models/post';
const router = express.Router();

// Define POST route for uploading
router.post('/', authMiddleware, uploadMiddleware, uploadImage);

router.get('/images', getImages); // This connects the GET request at /images to the getImages controller
router.post('/comment', authMiddleware, addComment); // New route for adding comments
router.post('/like', authMiddleware, likePost);

router.get('/user-posts', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const decoded = jwt.verify(token!, process.env.JWT_SECRET as string) as JwtPayload;
        
        const user = await User.findById(decoded.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const userPosts = await Post.find({ username: user.username })
            .sort({ createdAt: -1 })
            .populate('comments')
            .populate('likes');

        res.json(userPosts);
    } catch (error) {
        console.error('Error fetching user posts:', error);
        res.status(500).json({ message: 'Error fetching user posts' });
    }
});

export default router;