require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, '..', 'Frontend');
let dbConnected = false;
const inMemoryBookings = [];

// Security middleware
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(FRONTEND_DIR));

// Booking Schema
const bookingSchema = new mongoose.Schema({
    fullName: String,
    phone: String,
    email: String,
    serviceCategory: String,
    serviceSelect: String,
    address: String,
    problem: String,
    description: String,
    preferredDate: String,
    preferredTime: String,
    createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
const emailEnabled = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

// Email transporter
const transporter = emailEnabled ? nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
}) : null;

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vashisth';
mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
  .then(() => {
    dbConnected = true;
    console.log('✅ MongoDB Connected');
  })
  .catch((err) => {
    dbConnected = false;
    console.log('⚠️ MongoDB not connected. Using fallback storage.');
    console.log('MongoDB Error:', err.message || err);
  });

// ========================================
// API ROUTES
// ========================================

// Create booking
app.post('/api/bookings', async (req, res) => {
    try {
        const bookingData = req.body;
        const booking = new Booking(bookingData);

        if (dbConnected) {
            await booking.save();
        } else {
            inMemoryBookings.unshift({
                ...bookingData,
                createdAt: new Date().toISOString()
            });
        }
        
        console.log('🆕 New Booking:', {
            name: bookingData.fullName,
            phone: bookingData.phone,
            service: bookingData.serviceSelect || bookingData.serviceCategory,
            storedIn: dbConnected ? 'MongoDB' : 'memory'
        });
        
        if (emailEnabled && transporter) {
            const adminEmail = {
                from: `"Vashisth Bot" <${process.env.EMAIL_USER}>`,
                to: 'tarunvashisth823@gmail.com',
                subject: `🚨 NEW BOOKING - ${bookingData.fullName}`,
                html: generateAdminEmail(bookingData)
            };

            if (bookingData.email) {
                const customerEmail = {
                    from: `"Vashisth Local Services" <${process.env.EMAIL_USER}>`,
                    to: bookingData.email,
                    subject: '✅ Your Service Booking Confirmed!',
                    html: generateCustomerEmail(bookingData)
                };
                await transporter.sendMail(customerEmail);
            }

            await transporter.sendMail(adminEmail);
        } else {
            console.log('Email sending skipped because EMAIL_USER/EMAIL_PASS is not configured.');
        }
        
        res.json({ 
            success: true, 
            message: 'Booking created! Specialist will call within 15 minutes.',
            bookingId: dbConnected ? booking._id : null
        });
        
    } catch (error) {
        console.error('Booking Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error. Call 9315414195 directly.' 
        });
    }
});

// Get bookings (Admin)
app.get('/api/bookings', async (req, res) => {
    try {
        if (dbConnected) {
            const bookings = await Booking.find().sort({ createdAt: -1 }).limit(50);
            return res.json(bookings);
        }
        return res.json(inMemoryBookings.slice(0, 50));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// WhatsApp webhook (Future)
app.post('/api/whatsapp', (req, res) => {
    console.log('WhatsApp message:', req.body);
    res.json({ success: true });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        bookingsToday: 'Check /api/bookings'
    });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ========================================
// EMAIL TEMPLATES
// ========================================
function generateAdminEmail(data) {
    return `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0D9488; font-size: 28px;">🆕 New Service Booking</h2>
        <div style="background: #F8FAFC; padding: 24px; border-radius: 16px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 12px 0; font-weight: 600;">Customer:</td><td>${data.fullName}</td></tr>
                <tr><td style="padding: 12px 0; font-weight: 600;">📱 Phone:</td><td><strong>${data.phone}</strong></td></tr>
                <tr><td style="padding: 12px 0; font-weight: 600;">Service:</td><td>${data.serviceSelect || data.serviceCategory}</td></tr>
                <tr><td style="padding: 12px 0; font-weight: 600;">📍 Address:</td><td>${data.address}</td></tr>
                <tr><td style="padding: 12px 0; font-weight: 600;">Issue:</td><td>${data.problem}</td></tr>
                <tr><td style="padding: 12px 0; font-weight: 600;">Date/Time:</td><td>${data.preferredDate} @ ${data.preferredTime}</td></tr>
            </table>
        </div>
        <p style="color: #EF4444; font-size: 18px; font-weight: 700;">
            ⏰ CALL CUSTOMER NOW: <a href="tel:${data.phone}" style="color: #EF4444;">${data.phone}</a>
        </p>
        <hr style="border: none; height: 1px; background: #E5E7EB; margin: 24px 0;">
        <p style="color: #6B7280; font-size: 14px;">
            Auto-generated by Vashisth Local Services<br>
            Faridabad's trusted home services platform
        </p>
    </div>
    `;
}

function generateCustomerEmail(data) {
    return `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; color: #1F2937;">
        <h2 style="color: #0D9488; font-size: 28px; margin-bottom: 8px;">✅ Booking Confirmed!</h2>
        <p style="color: #10B981; font-size: 18px; font-weight: 600;">Our specialist will call you in <strong>15 minutes</strong></p>
        
        <div style="background: linear-gradient(135deg, #0D9488, #10B981); color: white; padding: 24px; border-radius: 16px; margin: 24px 0;">
            <h3 style="margin: 0 0 16px 0;">Your Booking Details:</h3>
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px; font-size: 16px;">
                <strong>Service:</strong><span>${data.serviceSelect || data.serviceCategory}</span>
                <strong>Date:</strong><span>${data.preferredDate}</span>
                <strong>Time:</strong><span>${data.preferredTime}</span>
                <strong>Address:</strong><span>${data.address}</span>
            </div>
        </div>
        
        <div style="background: #F8FAFC; padding: 20px; border-radius: 12px; margin: 24px 0;">
            <h4 style="color: #0D9488; margin-bottom: 12px;">📞 Emergency?</h4>
            <p style="font-size: 20px; margin: 0;"><a href="tel:9315414195" style="color: #F59E0B; text-decoration: none; font-weight: 700;">Call 9315414195</a></p>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: center; margin: 32px 0;">
            <div style="background: #10B981; color: white; padding: 12px 24px; border-radius: 50px; font-weight: 600;">60-Day Guarantee</div>
            <div style="background: #F59E0B; color: white; padding: 12px 24px; border-radius: 50px; font-weight: 600;">Verified Pro</div>
        </div>
    </div>
    `;
}

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Something went wrong!' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
