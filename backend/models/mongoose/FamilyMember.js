import mongoose from 'mongoose';

const FamilyMemberSchema = new mongoose.Schema({
  serNo: {
    type: Number,
    unique: true,
  },
  firstName: String,
  middleName: String,
  lastName: String,
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
  },
  dateOfBirth: Date,
  dateOfMarriage: Date,
  dateOfDeath: Date,
  isAlive: {
    type: Boolean,
    default: true,
  },
  profilePicture: String,
  email: String,
  phoneNumber: String,
  occupation: String,
  maritalStatus: String,
  education: String,
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  biography: String,
  vanshNumber: String,
  bloodGroup: String,
  notes: String,
  createdBy: mongoose.Schema.Types.ObjectId,
  createdByName: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('FamilyMember', FamilyMemberSchema);