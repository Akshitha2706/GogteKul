import mongoose from 'mongoose';

const LegacyLoginSchema = new mongoose.Schema({
  email: {
    type: String,
    lowercase: true,
  },
  username: {
    type: String,
  },
  password: {
    type: String,
  },
  firstName: String,
  lastName: String,
  serNo: Number,
  serno: Number,
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('LegacyLogin', LegacyLoginSchema);