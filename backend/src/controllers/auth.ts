import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';

// Register function
export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { username, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash the password and create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    return res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Login function
export const login = async (req: Request, res: Response): Promise<Response> => {
  try { 
    const { username, password } = req.body;

    // Check if user exists and validate password
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET || '', { expiresIn: '1h' });
    const profilePictureUrl = user.profilePicture
    ? `http://localhost:5000/uploads/profile-pictures/${user.profilePicture}`
    : null;
    return res.json({ success: true, token, profilePicture: profilePictureUrl });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
