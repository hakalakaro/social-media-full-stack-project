/*
import mongoose, { Document, Schema } from 'mongoose';

interface CommentDocument extends Document {
  imageUrl: string;
  text: string;
  username: string;
  timestamp: Date;
}

const commentSchema = new Schema<CommentDocument>({
  imageUrl: { type: String, required: true },
  text: { type: String, required: true },
  username: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

export const Comment = mongoose.model<CommentDocument>('Comment', commentSchema);
*/ 