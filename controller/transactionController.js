const { transactionModel } = require('../model/transactionModel');
const axios = require('axios');
const otpGenerator = require('otp-generator');
const hospitalModel = require('../model/hospitalModel');

const korapay_secret_key = process.env.korapay_secret_key;
const frontendRedirectUrl = 'https://lifelink-xi.vercel.app/paymentcheck'; 

// PAYMENT PLAN PRICES
const plans = {
    monthly: 10000,
    quarterly: 30000,
    yearly: 100000,
};

// Initialize Payment
exports.initializePayment = async (req, res) => {
    try {
        const { email, name, plan } = req.body;
        const hospitalId = req.user.id;
        const hospital = await hospitalModel.findById(hospitalId);
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        if (!email || !name || !plan) {
            return res.status(400).json({ message: 'Email, Name and Plan are required' });
        }

        if (!plans[plan]) {
            return res.status(400).json({ message: 'Invalid Plan. Choose monthly, quarterly, or yearly.' });
        }

        const amount = plans[plan];
        const formattedDate = new Date().toLocaleString();
        const reference = `ALIFE-${otpGenerator.generate(10, { specialChars: false })}`;

        // Prepare payment data
        const paymentData = {
            amount,
            customer: { name, email },
            currency: 'NGN',
            reference,
            redirect_url: `${frontendRedirectUrl}?reference=${reference}`, 
        };

        const response = await axios.post(
            'https://api.korapay.com/merchant/api/v1/charges/initialize',
            paymentData,
            {
                headers: {
                    Authorization: `Bearer ${korapay_secret_key}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const { data } = response?.data;

        // Save Transaction
        const payment = new transactionModel({
            hospital: hospitalId,
            name,
            email,
            amount,
            reference,
            paymentDate: formattedDate
        });
        await payment.save();

        res.status(200).json({
            message: 'Payment initialized successfully',
            data: {
                checkout_url: data?.checkout_url,
                reference
            }
        });

    } catch (error) {
        console.error('Initialize Payment Error:', error.message);
        res.status(500).json({ message: 'Internal Server Error: ' + error.message });
    }
};

// Verify Payment
exports.verifyPayment = async (req, res) => {
    try {
        const { reference } = req.query;

        if (!reference) {
            return res.status(400).json({ message: 'Reference is required' });
        }

        const response = await axios.get(
            `https://api.korapay.com/merchant/api/v1/charges/${reference}`,
            {
                headers: { Authorization: `Bearer ${korapay_secret_key}` }
            }
        );

        const { data } = response?.data;

        if (data?.status === 'success') {
            const transaction = await transactionModel.findOneAndUpdate({ reference }, { status: 'success' }, { new: true });
                            
            const { hospital } = transaction;
            await hospitalModel.findByIdAndUpdate(hospital, {
                paymentStatus: true,
                payment: transaction._id,
            })
            return res.redirect(`${frontendRedirectUrl}?status=success&reference=${reference}`);
        } else {
            await transactionModel.findOneAndUpdate({ reference }, { status: 'failed' }, { new: true });
            return res.redirect(`${frontendRedirectUrl}?status=failed&reference=${reference}`);
        }

    } catch (error) {
        console.error('Verify Payment Error:', error.message);
        res.status(500).json({ message: 'Internal Server Error: ' + error.message });
    }
};
