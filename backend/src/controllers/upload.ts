import { Request, Response } from 'express';
import multer from 'multer';
import { Post } from '../models/post';
import path from 'path';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import fs from 'fs';

// File filter for allowed image types (jpg, jpeg, png)
const fileFilter = (req: Request, file: Express.Multer.File, cb: Function) => {
    const allowedTypes = /jpg|jpeg|png/;
    const mimeType = allowedTypes.test(file.mimetype);
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    // Log the file's MIME type and extension for debugging
    //console.log("File MIME Type: ", file.mimetype);
    //console.log("File Extension: ", path.extname(file.originalname));

    if (mimeType && extName) {
        return cb(null, true); // Allow the file to be uploaded
    } else {
        //console.log("File rejected: Invalid type"); // Log the rejected file
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
        //console.log('Extracted Username:', decoded.username); // Log the username

        if (!req.file) {
            res.status(400).send('No file uploaded.');
            return;
        }

        // Log the uploaded file details
        //console.log(`Image uploaded by user: ${decoded.username}`);

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
        const posts = await Post.find({}, 'imageUrl username comments _id likes');
        //console.log('Fetched Posts:', posts);
        
        const imagesWithDetails = posts.map(post => {
            const imageUrl = post.imageUrl.replace(/\\/g, '/');
            const username = post.username || 'Anonymous';
            const _id = post._id;
            const comments = post.comments || [];
            const likes = post.likes || [];
            return { imageUrl, username, _id, comments, likes };
        });

        res.json(imagesWithDetails);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching images', error });
    }
};

export const addComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { commentText, postId } = req.body;

        // Ensure that both fields are provided
        if (!commentText || !postId) {
            res.status(400).json({ message: 'Comment text and post ID are required' });
            return;
        }

        // Extract the token from the request headers
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { username: string };
        const username = decoded.username;

        // Find the post by ID
        const post = await Post.findById(postId);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }

        // Add the new comment to the post's comments array
        const newComment = {
            username,
            commentText,
            createdAt: new Date(),
        };

        post.comments.push(newComment);
        await post.save();

        res.status(200).json({ message: 'Comment added successfully' });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { postId, commentText } = req.body; // Changed from commentId to commentText
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { username: string };
        const username = decoded.username;

        const post = await Post.findById(postId);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }

        // Find the comment by text and username instead of ID
        const commentIndex = post.comments.findIndex(
            (comment: any) => comment.commentText === commentText && comment.username === username
        );

        if (commentIndex === -1) {
            res.status(403).json({ message: 'Comment not found or unauthorized to delete' });
            return;
        }

        // Remove the comment
        post.comments.splice(commentIndex, 1);
        await post.save();

        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Error deleting comment' });
    }
};

// Separate storage configuration for profile pictures
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/profile-pictures/');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const uploadProfile = multer({
    storage: profileStorage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpg|jpeg|png/;
        const isValidType = allowedTypes.test(file.mimetype);
        const hasValidExt = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (isValidType && hasValidExt) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, JPEG, and PNG files are allowed.'));
        }
    }
});

// Profile picture upload handler
export const uploadProfilePicture = [
    uploadProfile.single('profilePicture'),
    async (req: Request, res: Response) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            // Get the user token from the request headers
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            // Safely decode the token and assert the type to get the username
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as unknown;

            if (typeof decoded === 'object' && decoded !== null && 'username' in decoded) {
                const username = (decoded as { username: string }).username; // Safe type assertion here
                //console.log('User:', username);

                // Fetch the user's current profile picture from the database
                const existingProfilePicPath = await getUserProfilePic(username);

                if (existingProfilePicPath) {
                    // Delete the old profile picture from the file system
                    const filePathToDelete = path.join(__dirname, '../../uploads/profile-pictures/', existingProfilePicPath);
                    fs.unlink(filePathToDelete, (err) => {
                        if (err) {
                            console.error('Error deleting old profile picture:', err);
                        } else {
                            //console.log('Old profile picture deleted');
                        }
                    });
                }

                // Construct the new file path
                const filePath = `/uploads/profile-pictures/${req.file.filename}`;
                //console.log('Profile picture saved to:', filePath);

                // Save the new profile picture file path in the database
                await updateUserProfilePic(username, req.file.filename);

                res.json({ message: 'Profile picture uploaded successfully', filePath });
            } else {
                return res.status(400).json({ message: 'Invalid token' });
            }
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            res.status(500).json({ message: 'Failed to upload profile picture' });
        }
    }
];

// Example functions for fetching and updating the user's profile picture
const getUserProfilePic = async (username: string): Promise<string | null> => {
    const user = await User.findOne({ username });
    return user?.profilePicture || null;
};

const updateUserProfilePic = async (username: string, fileName: string): Promise<void> => {
    await User.updateOne({ username }, { profilePicture: fileName });
};

export const likePost = async (req: Request, res: Response): Promise<void> => {
    console.log('Like post request received');
    const { postId } = req.body;
    const token = req.header('Authorization')?.replace('Bearer ', '');
  
    if (!token) {
      res.status(401).json({ message: 'No token, authorization denied' });
      return;
    }
  
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      //console.log('Decoded token:', decoded);  // Debugging the token
      const username = decoded.username;
  
      const post = await Post.findById(postId);
      if (!post) {
        res.status(404).json({ message: 'Post not found' });
        return;
      }
  
      //console.log('Post found:', post);  // Log the post found
      if (post.likes.includes(username)) {
        post.likes = post.likes.filter((like) => like !== username);
      } else {
        post.likes.push(username);
      }
  
      await post.save();
      res.status(200).json({ message: 'Like toggled', likes: post.likes.length });
    } catch (error) {
      console.error('Error liking post:', error);  // Log the error
      res.status(500).json({ message: 'Error liking post', error });
    }
  };

  export const getUserFriends = async (req: Request, res: Response): Promise<void> => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) {
        res.status(401).json({ message: 'Authorization denied' });
        return;
      }
  
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { username: string };
      const username = decoded.username;
  
      const user = await User.findOne({ username });
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
  
      // Fetch friends' details
      const friendsDetails = await User.find(
        { username: { $in: user.friends } },
        { username: 1, profilePicture: 1, lastActive: 1 } // Include `lastActive` field
      );
  
      // Map friends' details
      const response = friendsDetails.map(friend => {
        // Log raw `lastActive` field value
        console.log('Raw lastActive value:', friend.lastActive);
  
        // Ensure `lastActive` is a valid date string and parse it in UTC
        const lastActiveTime = friend.lastActive ? new Date(friend.lastActive).toISOString() : null;
        console.log('Parsed lastActive (UTC):', lastActiveTime);
  
        // Handle case where `lastActive` might be invalid or null
        if (!lastActiveTime || isNaN(new Date(lastActiveTime).getTime())) {
          console.log('Invalid lastActive time for', friend.username);
          return {
            username: friend.username,
            profilePicture: friend.profilePicture || '/uploads/profile-pictures/profileplaceholder.png',
            isOnline: false, // Consider as offline if the time is invalid
          };
        }
  
        const currentTime = new Date().toISOString(); // Current time in UTC
        const oneHourAgo = new Date(new Date().getTime() - 60 * 60 * 1000).toISOString(); // One hour ago in UTC
        const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString(); // One day ago in UTC
  
        console.log(`Raw lastActive for ${friend.username}:`, friend.lastActive);
        console.log('Last Active Time:', lastActiveTime);
        console.log('Current Time:', currentTime);
        console.log('One Hour Ago:', oneHourAgo);
  
        const timeTolerance = 5000; // 5 seconds

const isOnline = (lastActiveTime > oneHourAgo) && (Math.abs(new Date(lastActiveTime).getTime() - new Date().getTime()) > timeTolerance);
        console.log(`${friend.username} is online:`, isOnline);
  
        return {
          username: friend.username,
          profilePicture: friend.profilePicture || '/uploads/profile-pictures/profileplaceholder.png', // Fallback profile picture
          isOnline,
        };
      });
  
      res.json(response);
    } catch (error) {
      console.error('Error fetching friends:', error);
      res.status(500).json({ message: 'Error fetching friends', error });
    }
  };
  
  
  export const updateLastActive = async (req: Request, res: Response) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'Authorization denied' });
      }
  
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { username: string };
      const username = decoded.username;
  
      // Update the lastActive time to now
      await User.updateOne({ username }, { $set: { lastActive: new Date() } });
  
      res.json({ message: 'Last active time updated' });
    } catch (error) {
      console.error('Error updating last active time:', error);
      res.status(500).json({ message: 'Error updating last active time', error });
    }
  };

// Export the multer middleware as a separate function
export const uploadMiddleware = upload.single('image');