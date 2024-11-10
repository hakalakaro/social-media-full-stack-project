import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        res.status(401).json({ message: 'Authentication token missing' });
        return; // Make sure to return after sending the response
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
        
        // Check if the id exists in the decoded token
        if (!decoded.id) {
            res.status(401).json({ message: 'Authentication failed' });
            return; // Make sure to return after sending the response
        }

        
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        res.status(401).json({ message: 'Invalid authentication token' });
        return; // Make sure to return after sending the response
    }
};

export default authMiddleware; // Default export