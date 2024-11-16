import { Request, Response } from 'express';
import { Comment } from '../models/comment';
import { Post } from '../models/post';
import jwt, { JwtPayload } from 'jsonwebtoken';
// Post a new comment
export const postComment = async (req: Request, res: Response): Promise<void> => {
    const token = req.headers.authorization?.split(' ')[1];
  
    if (!token) {
      res.status(401).json({ message: 'Authentication token missing' });
      return;
    }
  
    try {
      // Decode the token to get the username and userId
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
      const username = decoded.username;
      const userId = decoded.id;
  
      if (!username || !userId) {
        res.status(400).json({ message: 'Invalid token data' });
        return;
      }
  
      const { comment, postId } = req.body;
  
      // Ensure comment text and post ID are provided
      if (!comment || !postId) {
        res.status(400).json({ message: 'Comment text and post ID are required' });
        return;
      }
  
      // Check if the post exists
      const post = await Post.findById(postId);
      if (!post) {
        res.status(404).json({ message: 'Post not found' });
        return;
      }
  
      // Create and save the new comment
      const newComment = new Comment({
        comment,
        postId,
        username,
        userId,
        createdAt: new Date(),
      });
  
      await newComment.save();
  
      res.status(201).json({ message: 'Comment added successfully', comment: newComment });
    } catch (error) {
      console.error('Error posting comment:', error);
      res.status(500).json({ message: 'Failed to post comment' });
    }
  };
  
  // Controller to fetch comments for a specific post
  export const getComments = async (req: Request, res: Response): Promise<void> => {
    const { postId } = req.params;
  
    try {
      const comments = await Comment.find({ postId }).sort({ createdAt: -1 });
  
      if (!comments) {
        res.status(404).json({ message: 'No comments found' });
        return;
      }
  
      res.status(200).json(comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ message: 'Failed to fetch comments' });
    }
  };