import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  friends: { type: [String], default: [] },
  friendRequests: { type: [String], default: [] },
  profilePicture: { type: String, default: '' },
});

export default mongoose.model('User', userSchema);