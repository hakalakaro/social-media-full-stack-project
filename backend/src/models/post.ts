import mongoose, { Schema, Document } from 'mongoose';

export interface PostDocument extends Document {
    imageUrl: string;
    createdAt: Date;
    username: string; 
}

const postSchema = new Schema({
    imageUrl: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    username: { type: String, required: true },
});


export const Post = mongoose.model<PostDocument>('Post', postSchema);