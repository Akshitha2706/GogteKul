import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema(
  {
    serNo: {
      type: Number,
      unique: true,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    approvalDate: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    hierarchyFormId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fami',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Member', memberSchema, 'members');