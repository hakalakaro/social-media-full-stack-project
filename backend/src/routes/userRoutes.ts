import User from '../models/User';  // Your User model
import { Request, Response } from 'express';

const express = require('express');
const router = express.Router();

router.get('/search', async (req: Request, res: Response) => {
    try {
        const query = req.query.query as string; // Type the query as a string
        //console.log(`Search query: ${query}`);
        const users = await User.find({
            username: { $regex: query, $options: 'i' }, // Case-insensitive search
        }).exec();
        //console.log(`Found ${users.length} user(s) matching '${query}'`);
        return res.json(users); // Return the found users
    } catch (error) {
        console.error('Error occurred while searching:', error);
        return res.status(500).json({ message: 'An error occurred while searching' });
    }
});

export default router;