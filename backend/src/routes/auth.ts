import express from 'express';
import { register, login } from '../controllers/auth';

const router = express.Router();

// Wrap the controller functions in an inline function
router.post('/register', (req, res) => {
  register(req, res).catch((error) => res.status(500).json({ message: 'Internal server error', error }));
});

router.post('/login', (req, res) => {
  login(req, res).catch((error) => res.status(500).json({ message: 'Internal server error', error }));
});

export default router;