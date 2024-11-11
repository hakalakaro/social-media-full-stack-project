// src/types/express.d.ts
import { Request } from 'express'; // Import only Request to avoid the unused warning.

declare global {
  namespace Express {
    interface Request {
      username?: string; // Add 'username' property to Request type
    }
  }
}