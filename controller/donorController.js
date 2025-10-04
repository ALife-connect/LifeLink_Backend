  const { donorModel } = require('../model/donorModel');
  const mongoose = require('mongoose');
  const bloodRequestModel = require('../model/bloodRequestModel')
  const bcrypt = require('bcrypt');
  const jwt = require('jsonwebtoken');
  const resetMail = require("../utils/resetMail");
  const sendMail = require("../utils/email");
  const cloudinary = require('../config/cloudinary');
  const welcomeMail = require('../utils/welcome')
  const{ stringifyPhoneNumber}  = require('../utils/phoneNumber')
  const fs = require("fs");
const hospitalModel = require('../model/hospitalModel');
const {appointmentModel} = require('../model/appointmentModel');
const moment = require('moment');
const otpGenerator = require('otp-generator');
const generateOTP = () => {
  return otpGenerator.generate(6, { 
    upperCaseAlphabets: false, 
    lowerCaseAlphabets: false, 
    specialChars: false 
  });
};


const generatedToken = (id) => {
    return jwt.sign({ id}, process.env.key, { expiresIn: "1d" });
  }

exports.register = async (req, res) => {
      try {
        //Extract required data from request body
        const { fullName, email, password, bloodType, location, age  } = req.body;
        const hospitalEmail = await hospitalModel.findOne({ email: email.toLowerCase()});
        if(hospitalEmail){
          return res.status(400).json({
            message: `Email ${email} is already registered as Hospital`
          })
        };
        const userExists = await donorModel.findOne({ email: email.toLowerCase() });
        if (userExists){
          return res.status(400).json({
            message: `Email ${email} is already registered`,
          });
        }
        //Salt and hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

          const emailOtp = generateOTP();
          const phoneOtp = generateOTP();
          const otpExpires = Date.now() + 5 * 60 * 1000; 

        //Create user
        const donor = new donorModel({
          fullName: fullName.trim(),
          email: req.body.email?.toLowerCase(),
          password: hashedPassword,
          bloodType,
          location, 
          age,
          emailOtp,
          phoneOtp,
          otpExpires
        });
      
        const token = await jwt.sign({ donorId: donor._id }, process.env.key, { expiresIn: "20mins" });
        // const link = `lifelink-xi.vercel.app/verifymail/${token}`
        // `${req.protocol}://${req.get("host")}/api/v1/verify-user/${token}`;
        const firstName = donor.fullName.split(" ")[0];
        const mailDetails = {
        email: donor.email,
        subject: "🌹 Welcome to ALIFE",
        html: welcomeMail(firstName, emailOtp),
      };

      
      await sendMail(mailDetails);
        await donor.save();
        res.status(201).json({
          message: "Donor created successfully. verify Otp sent to your mail.",
          data: donor,
          token
        });
} catch (error){
        res.status(500).json({
          message: "Internal server error " + error.message,
        });
      }
};

exports.verifyDonors = async (req, res) => {

  try {
    const { email, phoneNumber, otp } = req.body;
    
    if ((!email && !phoneNumber) || !otp) {
      return res.status(400).json({
        status: false,
        message: "Email or phone number and OTP are required"
      });
    }

    let user;

    
    if (email) {
      user = await donorModel.findOne({ email });
      if (!user) {
        user = await hospitalModel.findOne({ email });
      }
    } else if (phoneNumber) {
      user = await donorModel.findOne({ phoneNumber });
      if (!user) {
        user = await hospitalModel.findOne({ phoneNumber });
      }
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

  
    if (user.isVerified) {
      return res.status(400).json({
        message: "User has already been verified. Please proceed to login."
      });
    }
    if (
      user.emailOtp !== otp ||
      !user.otpExpires ||
      user.otpExpires < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    
    user.isVerified = true;
    user.emailOtp = undefined; 
    user.otpExpires = undefined;
    await user.save()
    return res.status(200).json({
      status: true,
      message: "Account verified successfully"
    });

  } catch (error) {
    
    return res.status(500).json({
      status: false,
      message: "Internal Server Error: " + error.message
    });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Please enter your Email Address"
      });
    }

    let user = await donorModel.findOne({ email: email.toLowerCase() });
    let userType = "donor";
    if (!user) {
      user = await hospitalModel.findOne({ email: email.toLowerCase() });
      userType = "hospital";
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "User has already been verified, please proceed to login"
      });
    }

    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    
    user.emailOtp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const firstName = user.fullName.split(" ")[0];

    // Prepare email
    const mailDetails = {
      email: user.email,
      subject: "Your Verification OTP",
      html: `
        <p>Hi ${firstName},</p>
        <p>Your OTP for verification is: <b>${otp}</b></p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `
    };

    await sendMail(mailDetails);

    res.status(200).json({
      message: "A new OTP has been sent to your email",
      userType
    });

  } catch (error) {
    console.error("Error resending OTP:", error.message);
    res.status(500).json({
      message: "Internal Server Error: " + error.message
    });
  }
};

exports.login = async (req, res)=>{
      try{
        const {email, password} = req.body;
        if(email == undefined || password == undefined){
          return res.status(400).json({
            message: 'Email and password required'
          })
        }
    
      const donor = await donorModel.findOne({email: email.toLowerCase() });
      if(donor == null){
        return res.status(404).json({
          message: 'Invalid Credentials'
        })
      }
      const isPasswordCorrect = await bcrypt.compare(password, donor.password)
      if(isPasswordCorrect == false){
        return res.status(400).json({
          message: 'Invalid Credentials'
        })
      }
      const token = generatedToken(donor._id);
      res.status(200).json({
        message: 'Logged In Successfully',
        data: donor,
        token
      })
      }catch(error){
        console.log(error.message)
        res.status(500).json({
          message: 'Internal Server Error '+ error.message
        })
      }
    }

exports.getAllDonor = async (req, res) =>{
      try{
        const donors = await donorModel.find();
      res.status(200).json({
        message: "All Donor's in the database",
        data: donors,
        total: donors.length
      })}
      catch(error){
        console.log(error.message);
        res.status(500).json({
          message: 'Internal Server Error' + error.message
        })
        
      }
    
    }
exports.getOneDonorById = async (req, res)=>{
    try {
      const donor = await donorModel.findById(req.params.id);
      if(!donor){
        return res.status(404).json({
          message:'donor not found'
        })
      }
      
      res.status(200).json({
        message: 'Donor fetched successfully',
        data: donor
      })

    } catch (error) {
      res.status(500).json({
        message:'Internal Server Error' + error.message
      })
      
    }
  };

exports.getDashboard = async (req, res) => {
    try {
      const token =generatedToken(req.user._id);
      console.log(token)
      if (!token){
        return res.status(400).json({
          message: 'unable to generate token'
        });
      }
      console.log(req.user);
      
      res.status(200).json({
        message: req.user,
        token
      })
    } catch (error) {
      res.status(500).json({
        message: 'Internal Server Error' + error.message 
      })
    }
};

exports.getDonorAppointments = async (req, res) => {
  try {
    const donorId = req.user._id; 
    const appointments = await appointmentModel.find({ donor: donorId })
      .populate('hospital', 'name address email location') 
      .sort({ date: 1 }); 

    res.status(200).json({
      message: 'Donor appointments fetched successfully',
      appointments
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Internal server error: ' + error.message
    });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const donorId = req.user._id;
    const { appointmentId } = req.params;

    const appointment = await appointmentModel.findOne({
      _id: appointmentId,
      donor: donorId
    });

    if (!appointment) {
      return res.status(404).json({
        message: 'Appointment not found'
      });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        message: 'Appointment already cancelled'
      });
    }

    appointment.status = 'cancel';
    await appointment.save();

    res.status(200).json({
      message: 'Appointment cancelled successfully',
      appointment
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Internal server error: ' + error.message
    });
  }
};

exports.scheduleDonation = async (req, res)=> {
    try {
      const {date, hospitalId, time} = req.body;
      
      if (!date || !hospitalId || !time ){
        return res.status(400).json({
          message: 'Date, time and hospital are required'
        })
      }
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
  
      if (selectedDate <= today) {
        return res.status(400).json({
          message: 'You cannot select today or a past date. Please choose a future date.'
        });
      };
     
      const donor =   req.user;
      if (!donor) {
        return res.status(404).json({
          message: "Donor not found."
        });
      };
      if (!donor.isVerified) {
        return res.status(403).json({
          message: 'You must verify your email before scheduling a donation.'
        });
      };

      const appointment = await appointmentModel.create({
      donor: donor._id,
      hospital: hospitalId,
      date: selectedDate,
      time,
      status: "pending"
    });
      const updated = await donorModel.findByIdAndUpdate(req.user._id, { status: 'pending'}, {new: true});
      const token = generatedToken(updated._id);
      res.status(201).json({
        status: true,
        appointmentId: appointment._id,
        message: "donation appointment scheduled",
        scheduledDate: moment(selectedDate).format('YYYY-MM-DD'),
        scheduledTime: time,
        status:appointment.status,
        hospital: hospitalId,
        token
      })
      
    } catch (error) {
      res.status(500).json({
        status:false,
        message: 'Internal Server Error' + error.message
      })
    }
};
  
exports.getDonationsByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    const donor = await donorModel.findById(req.user._id);
    if (!donor) {
      return res.status(404).json({
        message: "Donor not found"
      });
    }

    const donations = await appointmentModel.find({ 
      donor: donor._id, 
      status 
    }).populate({
      path: 'hospital',
      select: 'fullName address phoneNumber phone profilePicture city location' 
    });

    if (donations.length === 0) {
      return res.status(404).json({
        message: `No ${status} donations found`
      });
    }

    const token = generatedToken(donor._id);

    res.status(200).json({
      message: `${status} donations fetched successfully`,
      donations,
      token
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error: " + error.message
    });
  }
};

exports.getHospitalDonationsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "Authorization token missing" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.key); // Make sure you have JWT_SECRET in env
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const hospitalId = decoded.id; // assuming the token payload contains hospital id as 'id'

    const validStatuses = ['pending', 'completed', 'cancelled']; // Update based on your real statuses

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status '${status}'. Valid statuses are: ${validStatuses.join(', ')}`
      });
    }

    const hospital = await hospitalModel.findById(hospitalId).select('fullName address phoneNumber email');

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    const donations = await appointmentModel.find({
      hospital: hospitalId,
      status
    }).populate({
      path: 'donor',
      select: 'fullName email phoneNumber address bloodGroup'
    });

    if (!donations.length) {
      return res.status(404).json({ message: `No donations with status '${status}' found for this hospital` });
    }

    res.status(200).json({
      message: `${status} donations for hospital fetched successfully`,
      hospital: {
        fullName: hospital.fullName,
        address: hospital.address,
        phoneNumber: hospital.phoneNumber
      },
      donations
    });

  } catch (error) {
    console.error("Error fetching hospital donations by status:", error);
    res.status(500).json({ message: `Internal Server Error: ${error.message}` });
  }
};

exports.getDonorNotifications = async (req, res) => {
    try {
      const donor = await donorModel.findById(req.user.id).populate('notifications.from', 'fullName email');
      
      if (!donor) {
        return res.status(404).json({ message: 'Donor not found.' });
      }
  
      res.status(200).json({
        message: 'Notifications fetched successfully',
        notifications: donor.notifications,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: 'Error fetching notifications: ' + error.message,
      });
    }
};

exports.logOut = async (req, res)=>{
    try {
      const token = req.headers.authorization?.split(' ')[1];
      let cancelToken = new Set();
      if(token){
        cancelToken.add(token);
      };
      res.status(200).json({
        message: 'Logged Out Successfully'
      })
    } catch (error) {
      res.status(500).json({
        message:'Internal Server Error' + error.message
      })
    }
  };

exports.updateProfile= async (req, res)=>{
    try {
      const updateFields = req.body;
      if(req.file){
        const result = await cloudinary.uploader.upload(req.file.path)
        const updatedDonor = await donorModel.findByIdAndUpdate(req.user._id, {profilePics:result.secure_url}, {new:true});
     
    console.log(updatedDonor)
    // Send a success response
    res.status(201).json({
      message: 'profile picture uploaded successfully',
      data: updatedDonor.profilePics});
    
    }else{
      return res.status(400).json({
        message: "Unable to Update Profile Pictuce"
      })
    }
    
  

  } catch (error) {
    // Unlink the file from our local storage
      fs.unlinkSync(req.file.path);   
      res.status(500).json({
        message: 'Internal Server Error' + error.message
      })
      
    }
};

exports.UpdateDonorDetails = async (req, res) =>{
  try {
    const updateFields = req.body;
    if(updateFields.phoneNumber){
      const phoneNumber = await stringifyPhoneNumber(updateFields.phoneNumber);
      if(!phoneNumber || !phoneNumber.isValid()){
        return res.status(400).json({
          message: "Invalid phone Number Format"
        });
      }
      updateFields.phoneNumber = phoneNumber.nationalNumber;
      updateFields.countryCode = phoneNumber.countryCallingCode;
    }
    const updatedDonor = await donorModel.findByIdAndUpdate( req.user._id, updateFields, {new: true});
    const token = generatedToken(updatedDonor._id);
    res.status(200).json({
      message: 'Profile Details Updated successfully',
      data: updatedDonor
    })
  } catch (error) {
    res.status(500).json({
      message:"Failed to update donor details" + error.message
    })
    
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: false, message: "Email is required" });
    }
    let user = await donorModel.findOne({ email: email.toLowerCase() });
    let userType = "donor";

    if (!user) {
      user = await hospitalModel.findOne({ email: email.toLowerCase() });
      userType = "hospital";
    }

    if (!user) {
      return res.status(404).json({ status: false, message: "Email not found" });
    }

    // generate OTP (6 digits)
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    const expires = Date.now() + 10 * 60 * 1000; // 10 min expiry

    user.resetOtp = otp;
    user.resetOtpExpires = expires;
    await user.save();

    // email subject + message
    const subject = "Reset Password Request";
    const html = `
      <p>Hello ${user.fullName?.split(" ")[0] || user.name},</p>
      <p>You requested to reset your password. Use the OTP below:</p>
      <h2>${otp}</h2>
      <p>This OTP will expire in 10 minutes.</p>
    `;

    await sendMail({ subject, email: user.email, html });

    res.status(200).json({
      status: true,
      message: `Reset password OTP sent successfully to ${userType}`,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.resetNewPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        status: false,
        message: "Email, OTP, and new password are required",
      });
    }

    let user = await donorModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await hospitalModel.findOne({ email: email.toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (!user.resetOtp || !user.resetOtpExpires) {
      return res.status(400).json({ status: false, message: "No OTP request found. Please request a new one." });
    }

    if (user.resetOtp !== otp) {
      return res.status(400).json({ status: false, message: "Invalid OTP" });
    }

    if (user.resetOtpExpires < Date.now()) {
      return res.status(400).json({ status: false, message: "OTP expired. Please request a new one." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    res.status(200).json({ status: true, message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// 🔹 Change Password (Donor + Hospital)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Please provide both current and new password." });
    }

    // Check both donor & hospital by req.user.id
    let user = await donorModel.findById(req.user.id);
    if (!user) {
      user = await hospitalModel.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error: " + error.message });
  }
};


exports.viewHospitals = async (req, res) => {
    try {
      // Fetch hospitals list
      const hospitals = await hospitalModel.find();
      if(!hospitals){
        return res.status.json({
          message: 'Hospitals Not Found'
        })
      }
      res.status(200).json({
        message: 'Available Hospitals',
        data: hospitals
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  };

exports.bookAppointment = async (req, res) => {
    try {
      const { hospitalId, date, time } = req.body;
      if (!hospitalId || !date || !time) {
        return res.status(400).json({ 
          message: "hospitalId, date, and time are required." 
        });
      }
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
  
      if (selectedDate <= today) {
        return res.status(400).json({
          message: 'You cannot select today or a past date. Please choose a future date.'
        });
      }

      const hospital = await hospitalModel.findById(hospitalId);
      if (!hospital) {
        return res.status(404).json({
       message: "Hospital not found." 
      });
      }
      const donor =   req.user;
      if (!donor) {
        return res.status(404).json({
          message: "Donor not found."
        });
      }
      if (!donor.isVerified) {
        return res.status(403).json({
          message: "You must verify your email before booking an appointment."
        });
      }
      const appointment = new appointmentModel({
        donor: req.user.id,
        hospital: hospitalId,
        date,
        time,
      });
  
      await appointment.save();
      const populatedAppointment = await appointmentModel.findById(appointment._id).populate('donor', 'fullName email bloodType').populate('hospital', 'fullName email');
  
      // Format date 
      const formattedDate = moment(populatedAppointment.date).format('YYYY-MM-DD');
      
      if (!populatedAppointment.donor.email) {
        return res.status(400).json({ message: "Donor email not found. Cannot send confirmation email." });
      }
      
      // Send email notification
      
        await sendMail({
          email: populatedAppointment.hospital.email,
          subject: 'New Appointment Request',
          text: `Hello ${populatedAppointment.hospital.fullName}, ...          
          A donor (${populatedAppointment.donor.fullName}) wants to book an appointment at your hospital.
          
          - Donor Name: ${populatedAppointment.donor.fullName}
          - Donor Email: ${populatedAppointment.donor.email}
          - Blood Type: ${populatedAppointment.donor.bloodType}
          - Appointment Date: ${formattedDate}
          - Appointment Time: ${populatedAppointment.time}
          
          Please log into the ALIFE app to manage the appointment.
          `
          });

          await hospitalModel.findByIdAndUpdate(hospitalId, {
            $push: {
              appointmentId: appointment._id,
              notifications: {
                message: `New appointment request from ${populatedAppointment.donor.fullName} for ${formattedDate} at ${populatedAppointment.time}.`,
                from: 'ALIFE',
                date: new Date()
              }
            }
          });
    
  
      res.status(200).json({
        status: true,
        message: 'Appointment booked successfully',
        appointment: {
          donorName: populatedAppointment.donor.fullName,
          donorEmail: populatedAppointment.donor.email,
          hospitalName: populatedAppointment.hospital.fullName,
          bloodType: populatedAppointment.donor.bloodType,
          date: formattedDate,
          time: populatedAppointment.time,
          status: populatedAppointment.status,
        }
      });
      
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error booking appointment: ' + err.message });
    }
  };  
    
exports.deleteDonor = async (req, res) => {
    try {
      const donor = await donorModel.findByIdAndDelete(req.params.id);
      if(!donor){
        return res.status(404).json({
          message: 'Donor not found'
        });
      }
      res.status(200).json({
        message: 'Donor deleted Successfully'
      })
    } catch (error) {
      res.status(500).json({
        message: 'Internal Server Error' + error.message
      })
    }
  }

  exports.oneBloodRequestById = async (req, res) => {
    try {
      const donor = req.user;
  
      if (!donor) {
        return res.status(401).json({ message: "Unauthorized. Donor not found." });
      }
  
      const bloodRequestId = req.params.bloodRequestId;
      if (!mongoose.Types.ObjectId.isValid(bloodRequestId)) {
        return res.status(400).json({ message: "Invalid blood request ID." });
      }
  
      
      const allBloodRequests = await bloodRequestModel.find().select('_id');
      const bloodRequestIds = allBloodRequests.map(request => request._id.toString());
      if (!bloodRequestIds.includes(bloodRequestId)) {
        return res.status(404).json({ message: 'Blood request not found' });
      }
  
      
      const bloodRequest = await bloodRequestModel.findById(bloodRequestId)
        .populate({
          path: 'hospital',
          select: 'fullName email location phone address city profilePics'
        });
  
      res.status(200).json({
        message: 'Blood request fetched successfully',
        data: {
          _id: bloodRequest._id,
          hospital: bloodRequest.hospital,
          bloodGroup: bloodRequest.bloodGroup,
          numberOfPints: bloodRequest.numberOfPints,
          preferredDate: bloodRequest.preferredDate,
          urgencyLevel: bloodRequest.urgencyLevel,
          amount: bloodRequest.amount,
          status: bloodRequest.status,
          createdAt: bloodRequest.createdAt,
          updatedAt: bloodRequest.updatedAt,
        }
      });
  
    } catch (error) {
      console.error('Error fetching blood request by ID:', error.message);
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  };