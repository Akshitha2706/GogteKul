import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      trim: true,
    },
    authorSerNo: {
      type: Number,
      required: true,
      index: true,
    },
    authorName: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    images: {
      url: String,
      thumbnail: String,
      caption: String,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'low',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    datePosted: {
      type: Date,
      default: Date.now,
    },
    publishDate: {
      type: Date,
    },
    visibleToAllVansh: {
      type: Boolean,
      default: true,
    },
    visibleVanshNumbers: [
      {
        type: String,
        trim: true,
      },
    ],
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('News', newsSchema, 'news');