const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer'); // EMAIL BHEJNE KE LIYE NAYA PACKAGE

const app = express();
app.use(cors());
app.use(express.json());

// --- EMAIL SETUP (NODEMAILER) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'chandangupta17102@gmail.com', // YAHAN APNA GMAIL ID DAALEIN
        pass: 'sjtghhlrfrcyxuvm'       // YAHAN APNA 16-DIGIT APP PASSWORD DAALEIN (Bina space ke)
    }
});

// OTP save rakhne ke liye temporary memory
const otpStore = {}; 

// --- MONGODB CONNECTION ---
const mongoURI = "mongodb+srv://chandangupta17102_db_user:DNfiZA3JtrV1D2Wi@cluster0.lsva5hs.mongodb.net/?appName=Cluster0"; 

mongoose.connect(mongoURI)
  .then(() => {
    console.log("MongoDB connected successfully! 🎉");
    const PORT = process.env.PORT || 3000; 
    app.listen(PORT, () => {
        console.log(`Backend Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection error ❌:", err);
  });

// --- MODELS ---
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const bookingSchema = new mongoose.Schema({
    instrument: { type: String, required: true },
    title: { type: String, required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    userEmail: { type: String, required: true }
});
const Booking = mongoose.model('Booking', bookingSchema);

// --- AUTH ROUTES ---
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Sabhi fields bharna zaroori hai!" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Yeh email pehle se registered hai!" });
        }

        const newUser = new User({ name, email, password });
        await newUser.save();
        res.json({ message: "Registration successful! Ab aap login kar sakte hain." });
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ message: "Server Error: " + err.message });
    }
});

// LOGIN + OTP SENDING ROUTE
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        if (!user) {
            return res.status(400).json({ message: "Galat Email ya Password!" });
        }

        // 4-Digit Random OTP Generate karein
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        
        // OTP ko memory mein save karein
        otpStore[email] = otp; 

        // Email bhejne ka format
        const mailOptions = {
            from: 'aapka-email@gmail.com', // YAHAN BHI APNA GMAIL ID DAALEIN
            to: email,
            subject: 'Your Login OTP - Tandem Lab Booking',
            text: `Hello ${user.name},\n\nYour 4-digit verification code for Tandem Lab Slot Booking is: ${otp}\n\nDo not share this code with anyone.\n\nThanks!`
        };

        // Email Bhejein
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Email bhejte waqt error:", error);
                return res.status(500).json({ message: "OTP email bhejne mein fail ho gaya. Kripya dobara koshish karein." });
            }
            res.json({ message: "OTP sent successfully!" });
        });
        
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Server Error: " + err.message });
    }
});

// NAYA: OTP VERIFY ROUTE
app.post('/api/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Check karein ki kya OTP sahi hai
        if (otpStore[email] && otpStore[email] === otp) {
            // OTP sahi hone par memory se hata dein
            delete otpStore[email]; 
            
            // User ki details wapas laayein
            const user = await User.findOne({ email }); 
            res.json({ message: "Authentication successful!", user });
        } else {
            res.status(400).json({ message: "Invalid ya galat OTP!" });
        }
    } catch (err) {
        console.error("OTP Verify Error:", err);
        res.status(500).json({ message: "Server Error: " + err.message });
    }
});

// --- BOOKING ROUTES ---
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find();
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: "Bookings laane mein error" });
    }
});

app.post('/api/bookings', async (req, res) => {
    try {
        const { instrument, title, start, end, userEmail } = req.body;
        const newStart = new Date(start);
        const newEnd = new Date(end);

        const clash = await Booking.findOne({
            instrument: instrument,
            start: { $lt: newEnd },
            end: { $gt: newStart }
        });

        if (clash) {
            return res.status(400).json({ message: "Yeh slot is instrument ke liye already booked hai! Clash nahi ho sakta." });
        }

        const total = await Booking.countDocuments();
        if (total >= 20000) {
            await Booking.deleteMany({});
            console.log("Database full ho gaya tha, purana data clean kar diya! 🧹");
        }

        const newBooking = new Booking({ instrument, title, start: newStart, end: newEnd, userEmail });
        await newBooking.save();
        
        res.json({ message: "Booking successfully saved!" });
    } catch (err) {
        console.error("Booking Error:", err);
        res.status(500).json({ message: "Booking save karne mein error", error: err.message });
    }
});

app.get('/', (req, res) => res.send('Tandem Lab Backend Running & Healthy with OTP System! 🎉'));