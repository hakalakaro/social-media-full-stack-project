import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import authMiddleware from '../middleware/authMiddleware';
import { uploadProfilePicture } from '../controllers/upload';
import { getUserFriends } from '../controllers/upload';

const express = require('express');
const router = express.Router();
router.use(authMiddleware);
// Send Friend Request
router.post('/send-friend-request', async (req: Request, res: Response) => {
  const { username } = req.body; // Target username to send request to

  // Extract the token from the authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  //console.log('Authorization header:', req.headers.authorization);
  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing' });
  }

  try {
    // Verify and decode the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { username: string };
    const senderUsername = decoded.username; // Extract sender's username from decoded token
    
    if (senderUsername === username) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
    }

    const targetUser = await User.findOne({ username });

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (targetUser.friends.includes(senderUsername)) {
      return res.status(400).json({ message: 'You are already friends with this user' });
    }

    // Prevent duplicate friend requests
    if (targetUser.friendRequests.includes(senderUsername)) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    targetUser.friendRequests.push(senderUsername);
    await targetUser.save();

    res.status(200).json({ message: 'Friend request sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Fetch Friend Requests
router.get('/friend-requests', async (req: Request, res: Response) => {
  // Extract the token from the authorization header
  const token = req.headers.authorization?.split(' ')[1];  // "Bearer <token>"
  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing' });
  }

  try {
    // Verify and decode the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { username: string };
    const username = decoded.username; // Extract username from decoded token

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ receivedRequests: user.friendRequests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Accept Friend Request
router.post('/accept-friend-request', async (req: Request, res: Response) => {
  const { username } = req.body; // Username of the sender of the request

  // Extract the token from the authorization header
  const token = req.headers.authorization?.split(' ')[1];  // "Bearer <token>"
  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing' });
  }

  try {
    // Verify and decode the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { username: string };
    const receiverUsername = decoded.username; // Extract receiver's username from decoded token

    const senderUser = await User.findOne({ username });
    const receiverUser = await User.findOne({ username: receiverUsername });

    if (!senderUser || !receiverUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add each other as friends
    senderUser.friends.push(receiverUsername);
    receiverUser.friends.push(username);

    // Remove from received requests
    receiverUser.friendRequests = receiverUser.friendRequests.filter(
      (user) => user !== username
    );

    await senderUser.save();
    await receiverUser.save();

    res.status(200).json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/upload-profile-picture', uploadProfilePicture);
router.get('/friends', authMiddleware, getUserFriends);
router.get('/profile-picture/:username', async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    res.json({ 
      profilePicture: user?.profilePicture ? `/uploads/profile-pictures/${user.profilePicture}` : null 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile picture' });
  }
});

router.post('/remove-friend', async (req: Request, res: Response) => {
  const { username } = req.body; // Username of friend to remove
  
  // Extract the token from the authorization header
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
      return res.status(401).json({ message: 'Authentication token missing' });
  }

  try {
      // Verify and decode the JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { username: string };
      const currentUsername = decoded.username;

      // Prevent removing yourself
      if (currentUsername === username) {
          return res.status(400).json({ message: 'You cannot remove yourself from friends' });
      }

      // Find both users
      const [currentUser, friendUser] = await Promise.all([
          User.findOne({ username: currentUsername }),
          User.findOne({ username })
      ]);

      if (!currentUser || !friendUser) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Check if they are actually friends
      if (!currentUser.friends.includes(username) || !friendUser.friends.includes(currentUsername)) {
          return res.status(400).json({ message: 'Users are not friends' });
      }

      // Remove each user from the other's friends list
      currentUser.friends = currentUser.friends.filter(friend => friend !== username);
      friendUser.friends = friendUser.friends.filter(friend => friend !== currentUsername);

      // Save both users
      await Promise.all([currentUser.save(), friendUser.save()]);

      res.status(200).json({ message: 'Friend removed successfully' });
  } catch (error) {
      console.error('Error removing friend:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
