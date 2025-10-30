import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    data: String,
    mimeType: String,
    originalName: String,
  },
  { _id: false }
);

const personalDetailsSchema = new mongoose.Schema(
  {
    firstName: String,
    middleName: String,
    lastName: String,
    gender: String,
    dateOfBirth: Date,
    confirmDateOfBirth: String,
    isAlive: String,
    confirmDateOfDeath: String,
    email: String,
    mobileNumber: String,
    country: String,
    state: String,
    district: String,
    city: String,
    area: String,
    colonyStreet: String,
    flatPlotNumber: String,
    buildingNumber: String,
    pinCode: String,
    aboutYourself: String,
    qualifications: String,
    profession: String,
    profileImage: imageSchema,
    everMarried: String,
  },
  { _id: false }
);

const parentsInformationSchema = new mongoose.Schema(
  {
    description: String,
    fatherFirstName: String,
    fatherMiddleName: String,
    fatherLastName: String,
    fatherEmail: String,
    fatherMobileNumber: String,
    fatherDateOfBirth: Date,
    fatherProfileImage: imageSchema,
    motherFirstName: String,
    motherMiddleName: String,
    motherLastName: String,
    motherMobileNumber: String,
    motherDateOfBirth: Date,
    motherProfileImage: imageSchema,
  },
  { _id: false }
);

const marriedDetailsSchema = new mongoose.Schema(
  {
    description: String,
    spouseFirstName: String,
    spouseMiddleName: String,
    spouseLastName: String,
    spouseGender: String,
    dateOfMarriage: Date,
    spouseDateOfBirth: Date,
    spouseProfileImage: imageSchema,
    spouseEmail: String,
    spouseMobileNumber: String,
    everDivorced: String,
  },
  { _id: false }
);

const membersSchema = new mongoose.Schema(
  {
    sNo: Number,
    isapproved: Boolean,
    personalDetails: personalDetailsSchema,
    parentsInformation: parentsInformationSchema,
    marriedDetails: marriedDetailsSchema,
    divorcedDetails: mongoose.Schema.Types.Mixed,
    remarriedDetails: mongoose.Schema.Types.Mixed,
    widowedDetails: mongoose.Schema.Types.Mixed,
    vansh: String,
    serNo: {
      type: Number,
      unique: true,
      sparse: true,
    },
    fatherSerNo: {
      type: Number,
      default: null,
    },
    motherSerNo: {
      type: Number,
      default: null,
    },
    spouseSerNo: {
      type: Number,
      default: null,
    },
    childrenSerNos: {
      type: [Number],
      default: [],
    },
    level: Number,
  },
  {
    collection: "members",
    timestamps: true,
  }
);

export default mongoose.model("Members", membersSchema);