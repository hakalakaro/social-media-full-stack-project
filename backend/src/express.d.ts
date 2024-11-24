import { Request } from 'express';
import { User }  from '../models/User'; // Ensure this path is correct
import { Post } from '../models/post';
declare global {
    namespace Express {
        interface Request {
            username?: string;  // Adding the username property to the Request interface
        }
    }
}