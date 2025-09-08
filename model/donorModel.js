const { string } = require("joi");
const mongoose = require("mongoose");

const donorSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true, 
      required: true,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      lowercase: true,
      unique: true
    },
    password: {
      type: String,
      required: true,
    },
    bloodType: {
      type: String
    },
    location: {
      type: String,
      required: true,
    },
    age: {
      type: String,
      required: true,
    },
    isVerified:{
    type: Boolean,
    default: false
  },
    gender: {
      type: String,
      trim: true,
      enum: ['male', 'female', 'other'],
      lowercase: true
    },
    phoneNumber: {
      type: String,
    },
    profilePics: {
      type: String
    },
    role: {
      type: String,
      enum: ['donor', 'hospital'],
      default: 'donor'
    },
    status: {
      type: String,
      enum:['pending', 'accepted', 'declined'],
      default: 'pending'
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
    
    donations:[{
      hospitalId: mongoose.Schema.Types.ObjectId,
      date: Date,
      status:{
        type: String,
        enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
      },
    },
  ],
    notifications:[{
      message:{
        type: String
       },
      from:{
        type: String
      },
      requestId:{
        type: String
      },
      read:{
        type: Boolean,
        default: false
      },
      date:{
        type: Date, default: Date.now
      }
    }],
    createdAt:{ 
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

exports.donorModel = mongoose.model("Donors", donorSchema)