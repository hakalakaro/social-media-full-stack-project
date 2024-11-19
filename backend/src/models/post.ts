import mongoose, { Schema, Document } from 'mongoose';

interface Comment {
    username: string;
    commentText: string;
    createdAt: Date;
}

export interface PostDocument extends Document {
    imageUrl: string;
    createdAt: Date;
    username: string;
    comments: Comment[];
    likes: string[];
}

const commentSchema = new Schema<Comment>({
    username: { type: String, required: true },
    commentText: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const postSchema = new Schema({
    imageUrl: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    username: { type: String, required: true },
    comments: { type: [commentSchema], default: [] },
    likes: [{ type: String }]
});


export const Post = mongoose.model<PostDocument>('Post', postSchema);