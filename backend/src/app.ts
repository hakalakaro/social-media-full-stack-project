import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import path from 'path';
import { getImages } from './controllers/upload';
import userRoutes from './routes/userRoutes';
import morgan from 'morgan';
import userRouter from './routes/user';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { Message } from './models/message';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store active connections
const activeUsers = new Map<string, string>(); // userId -> socketId

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user login
  socket.on('user_connected', (userId: string) => {
    console.log('User logged in:', userId);
    activeUsers.set(userId, socket.id);
  });

  // Handle private messages
  socket.on('private_message', async ({ to, message, from }) => {
    console.log('Message received:', { from, to, message });
    try {
      // Save message to database
      const newMessage = new Message({
        from,
        to,
        content: message,
        timestamp: new Date()
      });
      await newMessage.save();

      // Get recipient's socket ID
      const recipientSocket = activeUsers.get(to);
      if (recipientSocket) {
        // Send to recipient if online
        io.to(recipientSocket).emit('private_message', {
          from,
          message,
          timestamp: new Date()
        });
      }

      // Send confirmation to sender
      socket.emit('message_sent', {
        success: true,
        messageId: newMessage._id
      });
    } catch (error) {
      console.error('Error handling message:', error);
      socket.emit('message_sent', {
        success: false,
        error: 'Failed to send message'
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    // Remove user from active users
    for (const [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

app.use(morgan('dev'));

// Existing middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || "")
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// Routes
app.use('/auth', authRoutes);
app.use('/upload', uploadRoutes);
app.get('/upload/images', (req, res) => {
  getImages(req, res);
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static('uploads'));
app.use('/users', userRoutes);
app.use('/users', userRouter);

// Add new route for fetching chat history
app.get('/messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [
        { from: userId },
        { to: userId }
      ]
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Add this new route for chat history
app.post('/messages/history', async (req, res) => {
    try {
        const { user1, user2 } = req.body;
        
        // Find all messages between these two users
        const messages = await Message.find({
            $or: [
                { from: user1, to: user2 },
                { from: user2, to: user1 }
            ]
        }).sort({ timestamp: 1 }); // Sort by timestamp ascending
        
        res.json(messages);
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

const PORT = process.env.PORT || 5000;
// Use httpServer instead of app.listen
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export for testing purposes if needed
export default app;