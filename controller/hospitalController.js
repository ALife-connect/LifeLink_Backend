const {donorModel}  = require("../model/donorModel"); 
const  hospitalModel  = require("../model/hospitalModel");
const Hospital = require("../model/hospitalModel"); 
const {appointmentModel} = require("../model/appointmentModel"); 
const crypto = require("crypto");
const KYC = require('../model/kycModel');
const bcrypt = require("bcrypt"); 
const { unlink } = require('fs/promises'); 
const jwt = require("jsonwebtoken"); 
const { resetMail } = require("../utils/resetMail"); 
const { sendEmail } = require("../utils/sendEmail");
const sendMail = require("../utils/email");
require("dotenv").config(); 
const BloodRequest = require('../model/bloodRequestModel');
const multer = require('multer');
const welcomeMail = require('../utils/welcome')
const upload = multer({ dest: 'uploads/' }); 
const cloudinary = require('../config/cloudinary');
const moment = require('moment');
const bloodRequestModel = require("../model/bloodRequestModel");


exports.register =async (req, res) => {

  try {
    const { fullName, email, location, role, password, phone, city } = req.body;    
    // Validate input
    if (!fullName || !email || !location || !role || !password || !phone || !city) {
      return res.status(400).json({
        message: "All fields (fullName, email, location, role, password) are required",
      });
    }

    const emailNormalized = email.toLowerCase();
    const hospitalExists = await hospitalModel.findOne({ email: emailNormalized });

    if (hospitalExists) {
      return res.status(400).json({
        message: `Email ${email} is already registered`,
      });
    }
    const donorExists = await donorModel.findOne({ email: email.toLowerCase()});
    if(donorExists){
      return res.status(400).json({
        message:  `Email ${email} is already a registered Donor`
      })
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const emailOtp = generateOTP();
          const phoneOtp = generateOTP();
          const otpExpires = Date.now() + 5 * 60 * 1000; 

    const hospital = new hospitalModel({
      fullName: fullName.trim(),
      email: emailNormalized,
      location: location.trim(),
      role: role.trim().toLowerCase(),
      password: hashedPassword,
      phone: phone.trim().toLowerCase(),
      city: city.trim().toLowerCase(),
       emailOtp,
          phoneOtp,
          otpExpires
    });await hospital.save();

      // const token = await jwt.sign({ hospitalId: hospital._id }, process.env.key, { expiresIn: "10mins" });
      //   const link = `lifelink-xi.vercel.app/verifymail/${token}`
      //   // `${req.protocol}://${req.get("host")}/api/v1/verify-user/${token}`;
        const hospitalName = hospital.fullName.split(" ")[0];
        const mailDetails = {
        email: hospital.email,
        subject: "Welcome to ALIFE",
        html: welcomeMail(hospitalName, emailOtp),
      };
    await hospital.save();
    await sendMail(mailDetails)

    res.status(201).json({
      message: "Hospital created successfully",
      data: hospital,
      token
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error " + error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const hospital = await hospitalModel.findOne({ email: email.toLowerCase() });
    if (!hospital) {
      return res.status(404).json({ message: 'invalid credentials' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, hospital.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    //  Ensure role is saved correctly
    if (hospital.role.toLowerCase() !== 'hospital') {
      await hospitalModel.updateOne(
        { email: hospital.email },
        { $set: { role: 'hospital' } }
      );
      hospital.role = 'hospital'; // Also update the local object
    }

      const token = jwt.sign(
      { id: hospital._id, role: hospital.role }, // Now guaranteed to be lowercase
      process.env.key,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Logged In Successfully',
      data: hospital,
      token
    });

  } catch (error) {
    res.status(500).json({
      message: 'Internal Server Error ' + error.message
    });
  }
};

  exports.searchForDonors = async (req, res) => {
    try {
      
      if (req.user.role !== 'hospital') {
        return res.status(403).json({ message: 'Access denied. Only hospitals can search for donors.' });
      }
      
      if (!req.user.isKycVerified) {
        return res.status(400).json({ message: 'You are yet to complete your KYC, check your email and complete it.' });
      }
  
      const donors = await donorModel.find();
      res.status(200).json(donors);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };
  exports.submitBloodRequest = async (req, res) => { 
    try {
      let { bloodGroup, numberOfPints, preferredDate, urgencyLevel, amount } = req.body;

      if (req.user.role !== 'hospital') {
        return res.status(403).json({ message: 'Only hospitals can make a blood request' });
      }

      if (typeof amount === 'string') {
        amount = parseFloat(amount.replace(/,/g, ''));
      }

      if (!numberOfPints) {
        return res.status(400).json({ message: "numberOfPints is required." });
      }

      const formattedPreferredDate = moment(preferredDate, 'YYYY-MM-DD');

      // Create the blood request
      const request = new BloodRequest({
        hospital: req.user._id,
        bloodGroup,
        numberOfPints,
        preferredDate: formattedPreferredDate,
        urgencyLevel,
        amount,
      });
      await request.save();
      const hospitalName = req.user.fullName || 'Hospital';
      const newNotification = {
        requestId: request._id,
        message: `New blood request from ${hospitalName} for ${bloodGroup} blood group.`,
        from: hospitalName,
        date: new Date(),
        read: false 
      };
      
      await donorModel.updateMany(
        {},
        { $push: { notifications: newNotification } }
      );
      const donors = await donorModel.find({}, 'email');
      const donorEmails = donors.map(donor => donor.email).filter(email => !!email);

      if (donorEmails.length > 0) {
        const emailPromises = donorEmails.map(email => 
          sendEmail({
            email,
            subject: 'Urgent Blood Donation Request',
            html: `
              <h2>Urgent Blood Request</h2>
              <p>A new blood donation request has been posted for blood group <strong>${bloodGroup}</strong>.</p>
              <p>Please log in to ALIFE to check the details and schedule a donation if you can help.</p>
            `
          })
        );

        await Promise.all(emailPromises);
      }

      const responseData = {
        _id: request._id,
        hospital: request.hospital,
        bloodGroup: request.bloodGroup,
        numberOfPints: request.numberOfPints,
        preferredDate: moment(request.preferredDate).format('YYYY-MM-DD'), 
        urgencyLevel: request.urgencyLevel,
        amount: request.amount,
        status: request.status,
        createdAt: moment(request.createdAt).format('YYYY-MM-DD HH:mm'),
        updatedAt: moment(request.updatedAt).format('YYYY-MM-DD HH:mm'),
      };

      res.status(201).json({ message: 'Blood request submitted successfully', data: responseData });

    } catch (error) {
      console.error('Error submitting blood request:', error.message);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };


  exports.getAppointmentHistory = async (req, res) => {
    try {
      // Ensure the user is a hospital
      if (req.user.role !== 'hospital') {
        return res.status(403).json({ message: 'Only hospitals can view their appointment history' });
      }
  
      // Fetch the hospital's appointment history
      const appointments = await appointmentModel.find({ hospital: req.user.id })
        .sort({ date: -1 })  // Sort by date, most recent first
        .populate('donor', 'fullName email bloodType')  // Populate donor details
        .select('donor hospital date time status createdAt updatedAt'); // Explicitly select fields
  
      if (appointments.length === 0) {
        return res.status(404).json({ message: 'No appointments found for this hospital.' });
      }
  
      res.status(200).json({ appointments });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error, please try again later.' });
    }
  };
  

exports.getBloodRequestHistory = async (req, res) => {
    try {
      // Ensure the user is a hospital
      if (req.user.role !== 'hospital') {
        return res.status(403).json({ message: 'Only hospitals can view their blood request history' });
      }
      

      // Fetch the hospital's blood request history
      const requests = await BloodRequest.find({ hospital: req.user.id })
        .sort({ createdAt: -1 })
          // Sort by date, most recent first
        .select('bloodGroup numberOfPints preferredDate urgencyLevel amount status createdAt updatedAt'); 
  
      if (requests.length === 0) {
        return res.status(404).json({ message: 'No blood requests found for this hospital.' });
      }
  
      res.status(200).json({ requests });
    } catch (error) {
      res.status(500).json({ message: 'Server error, please try again later.' });
    }
  };

exports.getHospitalProfile = async (req, res) => {
  try {
    

    const hospital = await hospitalModel.findById(req.user.id).select('-password');

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    res.status(200).json({ hospital });
  } catch (error) {
    
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
};

exports.getOneHospital = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const hospital = await hospitalModel.findById(hospitalId).select('-password'); 

    if (!hospital) {
      return res.status(404).json({ 
        message: 'Hospital not found.' 
      });
    }

    res.status(200).json({
      message: 'Hospital fetched successfully',
      hospital,
    });
  } catch (error) {
    
    res.status(500).json({
       message: 'Server error' + error.message 

    });
  }
};

exports.updateProfile = async (req, res) => {
  upload.single('profilePicture')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: "Error uploading file", error: err.message });
    }

    const { phone, address, city, state } = req.body;
    const hospitalId = req.user.id;

    // Initialize an update object for the hospital
    const updatedHospitalData = {};

    // If there's a file, upload it to Cloudinary
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'hospital-profiles',  // You can change this to any folder name you like
          resource_type: 'auto',         // Automatically handles image, video, etc.
        });

        updatedHospitalData.profilePicture = result.secure_url;  // Get the URL of the uploaded image
      } catch (uploadError) {
        return res.status(500).json({ message: 'Error uploading file to Cloudinary', error: uploadError.message });
      }
    }

    // Add other fields to the update object if present
    if (phone) updatedHospitalData.phone = phone;
    if (address) updatedHospitalData.address = address;
    if (city) updatedHospitalData.city = city;
    if (state) updatedHospitalData.state = state;

    try {
      const updatedHospital = await hospitalModel.findByIdAndUpdate(
        hospitalId,
        { $set: updatedHospitalData },
        { new: true, runValidators: true }
      );

      if (!updatedHospital) {
        return res.status(404).json({ message: 'Hospital not found' });
      }

      res.status(200).json({
        message: 'Profile updated successfully',
        data: updatedHospital,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error updating profile' });
    }
  });
};

exports.deleteAccount = async (req, res) => {
  const hospitalId = req.user.id; // Assuming the user ID is stored in req.user.id

  try {
    const deletedHospital = await hospitalModel.findByIdAndDelete(hospitalId);

    if (!deletedHospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    res.status(200).json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error deleting account' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ status: false, message: "Email is required" });
  }

  try {
    const hospital = await hospitalModel.findOne({ email: email.toLowerCase() });
    if (!hospital) {
      return res.status(404).json({ status: false, message: "Hospital not found" });
    }

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

    hospital.resetOtp = otp;
    hospital.resetOtpExpires = otpExpires;
    await hospital.save();

    // Email HTML template
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>Hello ${hospital.name || "Hospital"},</p>
        <p>You requested to reset your password. Use the OTP below:</p>
        <h3 style="color:#0077b6; font-size:22px;">${otp}</h3>
        <p>This OTP will expire in 15 minutes.</p>
        <p>If you didn’t request this, please ignore this email.</p>
        <br/>
        <p>&copy; ${new Date().getFullYear()} ALIFE. All rights reserved.</p>
      </div>
    `;

    await sendEmail({
      email: hospital.email,
      subject: "Password Reset OTP",
      html: htmlContent,
    });

    res.status(200).json({
      status: true,
      message: "OTP sent to your email",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error sending OTP: " + error.message,
    });
  }
};

// ✅ Step 2: Reset password with OTP
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ status: false, message: "Email, OTP, and new password are required" });
    }

    const hospital = await hospitalModel.findOne({ email: email.toLowerCase() });
    if (!hospital) {
      return res.status(404).json({ status: false, message: "Hospital not found" });
    }

    // Check OTP
    if (!hospital.resetOtp || !hospital.resetOtpExpires) {
      return res.status(400).json({ status: false, message: "No OTP request found. Please request a new one." });
    }

    if (hospital.resetOtp !== otp) {
      return res.status(400).json({ status: false, message: "Invalid OTP" });
    }

    if (hospital.resetOtpExpires < Date.now()) {
      return res.status(400).json({ status: false, message: "OTP expired. Please request a new one." });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    hospital.password = await bcrypt.hash(newPassword, salt);

    // Clear OTP fields
    hospital.resetOtp = undefined;
    hospital.resetOtpExpires = undefined;

    await hospital.save();

    res.status(200).json({
      status: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error resetting password: " + error.message,
    });
  }
};





exports.submitKYC = async (req, res) => {
  let uploadedFilePaths = [];
  try {
    const hospital = req.user; 

    if (!hospital || !hospital._id) {
      return res.status(401).json({ message: 'Unauthorized. Hospital information not found.' });
    }

    const hospitalId = hospital._id;
    const { licenseNumber } = req.body;
    const files = req.files;

    if (!licenseNumber || !files || !files.facilityImage || !files.accreditedCertificate || !files.utilityBill) {
      return res.status(400).json({ message: 'License number and all required documents are needed.' });
    }

    
    const existingKYC = await KYC.findOne({ hospital: hospitalId });

    if (existingKYC) {
      if (existingKYC.status === 'pending') {
        return res.status(400).json({ message: 'A KYC is already pending. Resubmission not allowed.' });
      }
      if (existingKYC.status === 'declined') {
        await KYC.findByIdAndDelete(existingKYC._id);
      }
    }

    
    const facilityImageUpload = await cloudinary.uploader.upload(files.facilityImage[0].path);
    const certificateUpload = await cloudinary.uploader.upload(files.accreditedCertificate[0].path);
    const utilityBillUpload = await cloudinary.uploader.upload(files.utilityBill[0].path);

    // Track uploaded local files to unlink later
    uploadedFilePaths.push(files.facilityImage[0].path, files.accreditedCertificate[0].path, files.utilityBill[0].path);

    // Save new KYC record
    const kycData = await KYC.create({
      hospital: hospitalId,
      facilityImage: facilityImageUpload.secure_url,
      accreditedCertificate: certificateUpload.secure_url,
      licenseNumber,
      utilityBill: utilityBillUpload.secure_url,
      status: 'pending',
    });

    // Update hospital kycCompleted field
    await hospitalModel.findByIdAndUpdate(hospitalId, { kycCompleted: true });

    // Delete local files after uploading
    for (const filePath of uploadedFilePaths) {
      await unlink(filePath);
    }

    res.status(201).json({ message: 'KYC submitted successfully', kycData });

  } catch (error) {
    // Clean up uploaded local files if error occurs
    if (uploadedFilePaths.length > 0) {
      for (const filePath of uploadedFilePaths) {
        await unlink(filePath);
      }
    }
    console.error(error);
    res.status(500).json({ message: 'KYC submission failed', error: error.message });
  }
};

exports.getHospitalAppointments = async (req, res) => {
  try {
    if (req.user.role !== "hospital") {
      return res.status(403).json({ message: "Only hospitals can view their appointments." });
    }

    const appointments = await appointmentModel
      .find({ hospital: req.user._id })
      .populate("donor", "fullName email bloodType phoneNumber")
      .sort({ createdAt: -1 }); // Latest first

    res.status(200).json({
      message: 'Appointment fetched successfully',
      data: appointments });
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching appointments. " + error.message });
  }
};


// exports.respondToAppointment = async (req, res) => {
//   try {
//     const { appointmentId } = req.params;
//     const { status } = req.body; // expected 'accepted' or 'declined'

//     if (!["accepted", "declined"].includes(status)) {
//       return res.status(400).json({ message: "Status must be either 'accepted' or 'declined'." });
//     }

//     const appointment = await appointmentModel.findById(appointmentId).populate("donor", "fullName email");

//     if (!appointment) {
//       return res.status(404).json({ message: "Appointment not found." });
//     }

//     if (appointment.hospital.toString() !== req.user.id) {
//       return res.status(403).json({ message: "You can only manage your own hospital appointments." });
//     }

//     appointment.status = status;
//     await appointment.save();

//     await sendMail(
//       appointment.donor.email,
//       `Appointment ${status === "accepted" ? "Accepted" : "Declined"}`,
//       `Hello ${appointment.donor.fullName},

// Your appointment request has been ${status} by the hospital.

// Please log in to your ALIFE dashboard to view more details.

// Thank you,
// ALIFE Team`
//     );

//     await donorModel.findByIdAndUpdate(appointment.donor._id, {
//       $push: {
//         notifications: {
//           message: `Your appointment was ${status} by the hospital.`,
//           from: "Hospital",
//         },
//       },
//     });

//     res.status(200).json({ message: `Appointment ${status} successfully.` });
//   } catch (error) {
//     res.status(500).json({ message: "Server error while responding to appointment." + error.message });
//   }
// };

exports.getAllHospitalBloodRequests = async (req, res) => {
  try {
   
    const donor = await donorModel.findById(req.user._id).select('fullName email bloodGroup address');

    if (!donor) {
      return res.status(404).json({ message: "Donor not found" });
    }

    const bloodRequests = await bloodRequestModel.find( )
      .populate({
        path: 'hospital',
        select: 'fullName address phoneNumber city profilePicture'
      })
      .sort({ createdAt: -1 }); 
      
    if (!bloodRequests.length) {
      return res.status(404).json({ message: "No active blood requests found" });
    }
    res.status(200).json({
      message: "Active blood requests fetched successfully",
      data: bloodRequests._id,
      donor: {
        fullName: donor.fullName,
        email: donor.email,
        bloodGroup: donor.bloodGroup,
        address: donor.address
      },
      bloodRequests
    });

  } catch (error) {
    console.error("Error fetching blood requests:" + error.message);
    res.status(500).json({ message: `Internal Server Error: ${error.message}` });
  }
};

exports.deleteBloodRequest = async (req, res) => {
  try {
    const hospital = req.user; 
    const { id } = req.params;

    if (!hospital || hospital.role !== 'hospital') {
      return res.status(403).json({ message: 'Only hospitals can delete blood requests.' });
    }

    
    const bloodRequest = await bloodRequestModel.findById(id);

    if (!bloodRequest) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    
    if (bloodRequest.hospital.toString() !== hospital._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to delete this blood request.' });
    }

    
    await bloodRequestModel.findByIdAndDelete(id);

    res.status(200).json({ message: 'Blood request deleted successfully.' });

  } catch (error) {
    console.error('Error deleting blood request:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

exports.respondToAppointment = async (req, res) => {

  try {
    const { appointmentId } = req.params;
    const { status, newDate, newTime } = req.body;

    
    if (!['accepted', 'cancel', 'rescheduled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status provided.' });
    }    
    const appointment = await appointmentModel.findById(appointmentId).populate('donor').populate('hospital');
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    if (status === 'rescheduled') {
      if (!newDate || !newTime) {
        return res.status(400).json({ message: 'New date and time are required for rescheduling.' });
      }
      appointment.date = newDate;
      appointment.time = newTime;
    }
    appointment.status = status;
    await appointment.save();
    let emailSubject, emailText, notificationMessage;
    if (status === 'accepted') {
      emailSubject = 'Appointment Accepted';
      emailText = `Hello ${appointment.donor.fullName},\n\nYour appointment with ${appointment.hospital.fullName} has been accepted.\n\nDate: ${appointment.date}\nTime: ${appointment.time}\n\nThank you for using ALIFE.`;
      notificationMessage = `Your appointment on ${appointment.date.toDateString()} at ${appointment.time} has been accepted.`;
    } else if (status === 'cancel') {
      emailSubject = 'Appointment Canceled';
      emailText = `Hello ${appointment.donor.fullName},\n\n We regret to inform you that your appointment with ${appointment.hospital.fullName} has been cancel.\n\n Thank you for using ALIFE.`;
      notificationMessage = `Your appointment on ${appointment.date.toDateString()} at ${appointment.time} has been cancel.`;
    } else if (status === 'rescheduled') {
      emailSubject = 'Appointment Rescheduled';
      emailText = `Hello ${appointment.donor.fullName},\n\nYour appointment with ${appointment.hospital.fullName} has been rescheduled.\n\nNew Date: ${appointment.date}\nNew Time: ${appointment.time}\n\nThank you for using ALIFE.`;
      notificationMessage = `Your appointment has been rescheduled to ${appointment.date.toDateString()} at ${appointment.time}.`;
    }

    
    await sendMail({
      email: appointment.donor.email,
      subject: emailSubject,
      text: emailText,
    });

    await donorModel.findByIdAndUpdate(appointment.donor._id, {
      $push: {
        notifications: {
          message: notificationMessage,
          from: `${appointment.hospital.fullName}`,
          date: new Date(),
        },
      },
    });
    return res.status(200).json({
      message: `Appointment ${status} successfully.`,
      appointment,
    });

  } catch (error) {
    console.error('Error responding to appointment:', error.message);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
