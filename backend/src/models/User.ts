import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String,  sparse: true }, // sparse so users can log in without email 
  password: { type: String, required: true },
  friends: { type: [String], default: [] },
  friendRequests: { type: [String], default: [] },
  profilePicture: { type: String, default: '' },
  lastActive: { type: Date, default: Date.now },
});

export default mongoose.model('User', userSchema);