const mongoose = require('mongoose');

const HospitalSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  location: { type: String, required: true },
  role: { type: String, default: 'hospital' },
  password: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  isVerified: {type: Boolean, default: false},
  city: { type: String },
  state: { type: String },
  profilePicture: { type: String },
  notifications:[{
    message:{
      type: String
     },
    from:{
      type: String
    },
    read:{
      type: Boolean,
      default: false
    },
    requestId:{
      type: String
    },
    date:{
      type: Date, default: Date.now
    },
  }],
  
  paymentStatus: {
    type: Boolean,
    default: false, 
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
  },
    emailOtp: {
      type: String
    },
    phoneOtp: {
      type: String
    },
    otpExpires: {
      type: Date,
      default: null
    },
    resetOtp: { 
      type: String 
    },
    resetOtpExpires: { 
      type: Date 
    },

  kycCompleted: { type: Boolean, default: false } 
}, { timestamps: true });


module.exports = mongoose.model('Hospital', HospitalSchema);