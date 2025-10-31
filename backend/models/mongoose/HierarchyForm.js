import mongoose from 'mongoose';

const HierarchyFormSchema = new mongoose.Schema({
  submittedBy: mongoose.Schema.Types.ObjectId,
  submittedByName: String,
  submittedByEmail: String,
  primaryMemberId: mongoose.Schema.Types.ObjectId,
  primaryMemberName: String,
  primaryMemberSerNo: Number,
  formData: mongoose.Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  approvedBy: mongoose.Schema.Types.ObjectId,
  approvedByName: String,
  approvalComments: String,
  rejectionReason: String,
  notes: String,
  attachments: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  approvedAt: Date,
});

export default mongoose.model('HierarchyForm', HierarchyFormSchema);