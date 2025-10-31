import mongoose from 'mongoose';

const loginSchema = new mongoose.Schema(
  {
    serNo: {
      type: Number,
      required: true,
      index: true,
      unique: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'dba'],
      default: 'user',
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Login', loginSchema, 'login');