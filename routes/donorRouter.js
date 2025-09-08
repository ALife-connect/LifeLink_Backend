const router = require('express').Router();
const { register, login, resetNewPassword, changePassword, forgotPassword, scheduleDonation, getAllDonor, getDashboard, getDonationsByStatus, deleteDonor, viewHospitals, bookAppointment, logOut, updateProfile, getOneDonorById, UpdateDonorDetails, getDonorNotifications, cancelAppointment, getDonorAppointments, verifyDonors, resendVerificationEmail, getHospitalDonationsByStatus, oneBloodRequestById } = require('../controller/donorController');
const { registerValidate, loginValidator } = require('../middleware/validate');
const {auth, roleAuth} = require('../middleware/authMiddleware');
const upload= require('../utils/multer');
const { getAllHospitalBloodRequests, deleteBloodRequest } = require('../controller/hospitalController');

/**
 * @swagger
 * tags:
 *   - name: Donor
 *     description: Operations for Donors
 */

/**
 * @swagger
 * /-request/{bloodRequestId}:
 *   get:
 *     summary: Get a single blood request by its bloodRequestId
 *     description: Allows a verified donor to fetch the details of a specific blood request by its ID.
 *     tags:
 *       - Requests
 *     security:
 *       - bearerAuth: []   # JWT Authentication
 *     parameters:
 *       - in: path
 *         name: bloodRequestId
 *         schema:
 *           type: string
 *         required: true
 *         description: The bloodRequestId of the blood request to fetch
 *     responses:
 *       200:
 *         description: Blood request fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Blood request fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     hospital:
 *                       type: object
 *                       properties:
 *                         fullName:
 *                           type: string
 *                         address:
 *                           type: string
 *                         phoneNumber:
 *                           type: string
 *                         city:
 *                           type: string
 *                         profilePics:
 *                           type: string
 *                     bloodGroup:
 *                       type: string
 *                     numberOfPints:
 *                       type: integer
 *                     preferredDate:
 *                       type: string
 *                       format: date
 *                     urgencyLevel:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     status:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized. Donor not found.
 *       404:
 *         description: Blood request not found.
 *       500:
 *         description: Internal server error
 */

router.get('/-request/:bloodRequestId', auth,  oneBloodRequestById);


/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new donor
 *     tags: [Donor]
 *     description: Register a new donor with full name, email, password, blood type, location, and age.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Life Link
 *               email:
 *                 type: string
 *                 example: LifeLink@mail.com
 *               password:
 *                 type: string
 *                 example: StrongPassword123
 *               bloodType:
 *                 type: string
 *                 example: O+
 *               location:
 *                 type: string
 *                 example: New York
 *               age:
 *                 type: string
 *                 example: "28"
 *     responses:
 *       201:
 *         description: Donor created successfully
 *       400:
 *         description: Email already exists
 *       500:
 *         description: Internal server error
 */
router.post("/register", registerValidate, register);

/**
 * @swagger
 * /verify-otp:
 *   post:
 *     summary: Verify donor or hospital using OTP
 *     tags: [Verification]
 *     description: Verify a donor or hospital account using the OTP sent to their email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 example: lifelink@mail.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Account verified successfully
 *       400:
 *         description: Invalid or expired OTP / already verified / missing fields
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/verify-otp', verifyDonors);


/**
 * @swagger
 * /resend-otp:
 *   post:
 *     summary: Resend OTP for verification
 *     tags: [Verification]
 *     description: Resend a new OTP to the user's registered email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: lifelink@mail.com
 *     responses:
 *       200:
 *         description: A new OTP has been sent to the email
 *       400:
 *         description: User is already verified or email is missing
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/resend-otp', resendVerificationEmail);

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Log in an existing donor
 *     tags: [Donor]
 *     description: Login a donor using email and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: LifeLink@mail.com
 *               password:
 *                 type: string
 *                 example: StrongPassword123
 *     responses:
 *       200:
 *         description: Logged in successfully
 *       400:
 *         description: Invalid Credentials
 *       404:
 *         description: Invalid Credentials
 *       500:
 *         description: Internal server error
 */
router.post("/login",loginValidator, login);

/**
 * @swagger
 * /donors:
 *   get:
 *     summary: Get all donors
 *     tags: [Donor]
 *     description: Retrieve all donors from the database.
 *     responses:
 *       200:
 *         description: List of all donors
 *       500:
 *         description: Internal server error
 */
router.get("/donors", getAllDonor);
/**
 * @swagger
 * /donors/{id}:
 *   get:
 *     summary: Get a donor by ID
 *     tags: [Donor]
 *     description: Retrieve a donor's details by their unique ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Donor ID
 *     responses:
 *       200:
 *         description: Donor details retrieved
 *       404:
 *         description: Donor not found
 *       401:
 *         description: Unauthorized - Token required or invalid
 *       500:
 *         description: Internal server error
 */
router.get("/donors/:id", auth, roleAuth(["admin", "hospital"]), getOneDonorById);

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get donor dashboard
 *     tags: [Donor]
 *     description: Retrieve the donor's dashboard information, including their profile.
 *     responses:
 *       200:
 *         description: Dashboard data retrieved
 *       500:
 *         description: Internal server error
 */
router.get("/dashboard", auth ,getDashboard);

/**
 * @swagger
 * /schedule:
 *   post:
 *     summary: Schedule a donation
 *     tags: [Donor]
 *     description: Schedule a donation appointment by selecting a date, time, and hospital ID. Donors must be verified before scheduling.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - hospitalId
 *               - time
 *             properties:
 *               date:
 *                 type: string
 *                 description: Date for the donation (format YYYY-MM-DD)
 *                 example: 2025-04-20
 *               hospitalId:
 *                 type: string
 *                 description: The ID of the hospital where the donation will happen
 *                 example: 64321ab7e2f476001d98dccc
 *               time:
 *                 type: string
 *                 description: Time for the donation (format HH:mm or hh:mm AM/PM)
 *                 example: "02:30 PM"
 *     responses:
 *       201:
 *         description: Donation scheduled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Donation appointment scheduled
 *                 scheduledDate:
 *                   type: string
 *                   example: 2025-04-20
 *                 scheduledTime:
 *                   type: string
 *                   example: 02:30 PM
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Missing required fields or invalid input
 *       403:
 *         description: Donor must verify email before scheduling
 *       404:
 *         description: Donor not found
 *       500:
 *         description: Internal server error
 */
router.post("/schedule", auth, scheduleDonation);

/**
 * @swagger
 * /hospitalDonationIn/{status}:
 *   get:
 *     summary: Get all donor's donations filtered by status with hospital details
 *     tags: [Donor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, rescheduled, cancelled]
 *         description: Status of the donation to filter
 *     responses:
 *       200:
 *         description: Donations fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: pending donations fetched successfully
 *                 donations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 66147c272bb29c76e9a83b56
 *                       donor:
 *                         type: string
 *                         example: 661479fe2bb29c76e9a83b45
 *                       hospital:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 66147b8a2bb29c76e9a83b22
 *                           name:
 *                             type: string
 *                             example: LifeLink General Hospital
 *                           address:
 *                             type: string
 *                             example: 123 Blood Drive Avenue, Lagos
 *                           phoneNumber:
 *                             type: string
 *                             example: +2348012345678
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: 2025-04-21
 *                       time:
 *                         type: string
 *                         example: 14:00
 *                       status:
 *                         type: string
 *                         example: pending
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-04-17T10:00:00.000Z
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-04-17T10:30:00.000Z
 *                 token:
 *                   type: string
 *                   description: Fresh JWT token after successful request
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       404:
 *         description: No donations found for the given status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No pending donations found
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: object
 *                   example: 'Internal Server Error: something went wrong'
 */
router.get("/hospitalDonationIn/:status", auth, getHospitalDonationsByStatus);

/**
 * @swagger
 * /donations/{status}:
 *   get:
 *     summary: Get all donor's donations filtered by status with hospital details
 *     tags: [Donor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, rescheduled, cancelled]
 *         description: Status of the donation to filter
 *     responses:
 *       200:
 *         description: Donations fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: pending donations fetched successfully
 *                 donations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 66147c272bb29c76e9a83b56
 *                       donor:
 *                         type: string
 *                         example: 661479fe2bb29c76e9a83b45
 *                       hospital:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 66147b8a2bb29c76e9a83b22
 *                           name:
 *                             type: string
 *                             example: LifeLink General Hospital
 *                           address:
 *                             type: string
 *                             example: 123 Blood Drive Avenue, Lagos
 *                           phoneNumber:
 *                             type: string
 *                             example: +2348012345678
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: 2025-04-21
 *                       time:
 *                         type: string
 *                         example: 14:00
 *                       status:
 *                         type: string
 *                         example: pending
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-04-17T10:00:00.000Z
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-04-17T10:30:00.000Z
 *                 token:
 *                   type: string
 *                   description: Fresh JWT token after successful request
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       404:
 *         description: No donations found for the given status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No pending donations found
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: object
 *                   example: 'Internal Server Error: something went wrong'
 */
router.get("/donations/:status", auth, getDonationsByStatus);

/**
 * @swagger
 * /donor/notifications:
 *   get:
 *     summary: Get donor notifications
 *     tags: [Donor]
 *     description: Fetch the notifications for a donor.
 *     security:
 *       - bearerAuth: []  # Indicating that this endpoint requires JWT authentication
 *     responses:
 *       200:
 *         description: Successfully retrieved donor notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       message:
 *                         type: string
 *                         example: "A new appointment has been scheduled."
 *                       from:
 *                         type: string
 *                         example: "Hospital XYZ"
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: "2025-04-20"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal server error
 */

router.get('/donor/notifications', auth, getDonorNotifications);

/**
 * @swagger
 * /donor/appointments:
 *   get:
 *     summary: Get all scheduled donations for a donor
 *     tags: [Donor Appointments]
 *     security:
 *       - bearerAuth: []  # Token auth required
 *     responses:
 *       200:
 *         description: List of donor appointments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Donor appointments fetched successfully
 *                 appointments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 6630abc123456789
 *                       hospital:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: Life Hospital
 *                           address:
 *                             type: string
 *                             example: 123 Health Street
 *                       date:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-05-01T00:00:00.000Z
 *                       time:
 *                         type: string
 *                         example: 10:00 AM
 *                       status:
 *                         type: string
 *                         example: pending
 *       401:
 *         description: Unauthorized - Token missing or invalid
 *       500:
 *         description: Internal server error
 */
router.get('/donor/appointments', auth, getDonorAppointments);


/**
 * @swagger
 * /donor/appointments/{appointmentId}/cancel:
 *   put:
 *     summary: Cancel a scheduled donation appointment
 *     tags: [Donor Appointments]
 *     security:
 *       - bearerAuth: []  # Token auth required
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the appointment to cancel
 *     responses:
 *       200:
 *         description: Appointment cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Appointment cancelled successfully
 *                 appointment:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 6630abc123456789
 *                     status:
 *                       type: string
 *                       example: cancelled
 *       400:
 *         description: Appointment already cancelled
 *       404:
 *         description: Appointment not found
 *       401:
 *         description: Unauthorized - Token missing or invalid
 *       500:
 *         description: Internal server error
 */
router.put('/donor/appointments/:appointmentId/cancel', auth, cancelAppointment);

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Log out a donor
 *     tags: [Donor]
 *     description: Log out the currently logged-in donor.
 *     responses:
 *       200:
 *         description: Donor logged out successfully
 *       500:
 *         description: Internal server error
 */
router.post("/logout", auth, logOut);

/**
 * @swagger
 * /profile:
 *   put:
 *     summary: Update donor profile picture
 *     tags: [Donor]
 *     description: Update donor's profile picture.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePics:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Profile updated successfully
 *       500:
 *         description: Internal server error
 */
router.put("/profile", auth, upload.single("profilePics"), updateProfile);

/**
 * @swagger
 * /update-profile:
 *   put:
 *     summary: Update donor profile information
 *     tags: [Donor]
 *     description: This route allows a donor to update any of their profile details including name, location, phone number, and other fields.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "life Link"
 *               location:
 *                 type: string
 *                 example: "Festac, Lagos"
 *               phoneNumber:
 *                 type: string
 *                 example: "+2349090909090"
 *               email:
 *                 type: string
 *                 example: "donor@example.com"
 *               age:
 *                 type: string
 *                 example: "30"
 *               gender:
 *                 type: string
 *                 example: "female"
 *               bloodType:
 *                 type: string
 *                 example: "O+"
 *     responses:
 *       200:
 *         description: Profile details updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Profile Details Updated successfully"
 *                 data:
 *                   type: object
 *                   example:
 *                     fullName: "Nlife Link"
 *                     email: "donor@example.com"
 *                     location: "Festac, Lagos"
 *                     phoneNumber: "+2349090909090"
 *                     bloodType: "O+"
 *                     age: "30"
 *                     gender: "female"
 *       400:
 *         description: Invalid input or phone number format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid phone Number Format"
 *       500:
 *         description: Server error while updating profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to update donor details: Internal Server Error"
 */

// Donor Update Route
router.put('/update-profile', auth, UpdateDonorDetails);


/**
 * @swagger
 * /forgotPassword:
 *   post:
 *     summary: Forgot password
 *     tags: [Donor]
 *     description: Send a password reset otp to the donor's email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: LifeLink@Mail.com
 *     responses:
 *       200:
 *         description: Reset password otp sent successfully
 *       404:
 *         description: Email not found
 *       500:
 *         description: Internal server error
 */
router.post("/forgotPassword", forgotPassword);


/**
 * @swagger
 * /resetPassword:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Donor]
 *     description: Reset donor's password using email, OTP, and new password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: donor@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 example: NewSecurePassword123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired OTP
 *       404:
 *         description: Donor not found
 *       500:
 *         description: Internal server error
 */
router.post("/resetPassword", resetNewPassword);


/**
 * @swagger
 * /changePassword:
 *   put:
 *     summary: Change password
 *     tags: [Donor]
 *     security:
 *       - bearerAuth: []   # <-- add this to require JWT token
 *     description: Change the donor's password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: OldSecurePass456
 *               newPassword:
 *                 type: string
 *                 example: AnotherSecurePass456
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password incorrect or invalid input
 *       404:
 *         description: Donor not found
 *       500:
 *         description: Internal server error
 */
router.put("/changePassword", auth, changePassword);

/**
 * @swagger
 * /deleteDonor/{id}:
 *   delete:
 *     summary: Delete a donor
 *     tags: [Donor]
 *     description: Delete a donor from the system by their ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Donor ID
 *     responses:
 *       200:
 *         description: Donor deleted successfully
 *       404:
 *         description: Donor not found
 *       500:
 *         description: Internal server error
 */
router.delete("/deleteDonor/:id", auth, roleAuth([ "admin" ]), deleteDonor);

/**
 * @swagger
 * /hospitals:
 *   get:
 *     summary: Get list of hospitals
 *     tags: [Donor]
 *     description: Retrieve all hospitals.
 *     responses:
 *       200:
 *         description: List of hospitals
 *       500:
 *         description: Internal server error
 */
router.get("/hospitals", viewHospitals);

/**
 * @swagger
 * /bookAppointment:
 *   post:
 *     summary: Book an appointment with a hospital
 *     tags: [Donor]
 *     security:
 *       - bearerAuth: []   # ✅ This matches your auth middleware
 *     description: Allows a donor to book an appointment with a selected hospital.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hospitalId
 *               - date
 *               - time
 *             properties:
 *               hospitalId:
 *                 type: string
 *                 example: 64321ab7e2f476001d98dccc
 *               date:
 *                 type: string
 *                 format: date
 *                 example: 2025-04-20
 *               time:
 *                 type: string
 *                 example: 10:00 AM
 *     responses:
 *       200:
 *         description: Appointment booked successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Hospital not found
 *       500:
 *         description: Internal server error
 */
router.post("/bookAppointment", auth, bookAppointment);

/**
 * @swagger
 * /blood-requests:
 *   get:
 *     summary: Get All Hospital Blood Requests
 *     description: Retrieve a list of all blood requests made by hospitals. Requires authentication via Bearer token.
 *     tags:
 *       - Blood Requests
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved blood requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: 60f7b2f9a1e4e23f8c8b4567
 *                       hospitalName:
 *                         type: string
 *                         example: City Hospital
 *                       bloodType:
 *                         type: string
 *                         example: O+
 *                       quantity:
 *                         type: integer
 *                         example: 5
 *                       status:
 *                         type: string
 *                         example: pending
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Unauthorized access. Token missing or invalid.
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: An error occurred while fetching blood requests.
 */

router.get('/blood-requests', auth, getAllHospitalBloodRequests);

/**
 * @swagger
 * /delete-blood-request/{id}:
 *   delete:
 *     summary: Delete a blood request by ID (only accessible by the hospital that created the request)
 *     tags: [Blood Requests]
 *     description: This route allows hospitals to delete a blood request they have created.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the blood request to be deleted.
 *         schema:
 *           type: string
 *           example: 60d8a000e8b1b76b6f3e4fdb
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Blood request deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Blood request deleted successfully"
 *       '400':
 *         description: Bad request, invalid ID or missing parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid blood request ID"
 *       '403':
 *         description: Forbidden, unauthorized access
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Only the hospital that created the blood request can delete it"
 *       '404':
 *         description: Not found, blood request not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Blood request not found"
 *       '500':
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */

router.delete('/delete-blood-request/:id', auth, deleteBloodRequest );


module.exports = router;