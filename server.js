const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// 1. MONGODB CONNECTION
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

// 2. USER SCHEMA & MODEL
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// 3. BOOKING SCHEMA & MODEL
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

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        if (!user) {
            return res.status(400).json({ message: "Galat Email ya Password!" });
        }
        res.json({ message: "Login successful!", user });
    } catch (err) {
        console.error("Login Error:", err);
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

        // Strict Overlap Check for the SAME instrument
        const clash = await Booking.findOne({
            instrument: instrument,
            start: { $lt: newEnd },
            end: { $gt: newStart }
        });

        if (clash) {
            return res.status(400).json({ message: "Yeh slot is instrument ke liye already booked hai! Clash nahi ho sakta." });
        }

        // Database limit management
        const total = await Booking.countDocuments();
        if (total >= 20000) {
            await Booking.deleteMany({});
            console.log("Database full ho gaya tha, purana data clean kar diya! 🧹");
        }

        const newBooking = new Booking({ instrument, title, start: newStart, end: newEnd, userEmail });
        await newBooking.save();
        
        console.log("Nayi Booking Saved:", newBooking);
        res.json({ message: "Booking successfully saved!" });
    } catch (err) {
        console.error("Booking Error:", err);
        res.status(500).json({ message: "Booking save karne mein error", error: err.message });
    }
});

// NAYA DELETE ROUTE YAHAN ADD KIYA GAYA HAI
app.delete('/api/bookings', async (req, res) => {
    try {
        const { id, userEmail } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Booking ID is missing!" });
        }

        // Database se booking delete karna, sath mein authorization check
        const deletedBooking = await Booking.findOneAndDelete({ 
            _id: id, 
            userEmail: userEmail 
        });

        if (!deletedBooking) {
            return res.status(403).json({ message: "Booking nahi mili ya aap ise cancel karne ke liye authorized nahi hain." });
        }

        res.status(200).json({ message: "Booking cancelled successfully!" });
    } catch (error) {
        console.error("Error deleting booking:", error);
        res.status(500).json({ message: "Server error during cancellation" });
    }
});

app.get('/', (req, res) => res.send('Tandem Lab Backend Running & Healthy! 🎉'));