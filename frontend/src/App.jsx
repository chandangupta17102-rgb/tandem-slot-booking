import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment.default || moment);

// FINAL LIVE BACKEND URL
const API_BASE_URL = "https://tandem-slot-booking.onrender.com";

// 1. Defined 3 Laboratory Categories with specific instruments
const labData = {
  "Fabrication Laboratory": [
    "Glove Box - 01", "Glove Box - 02", "Glove Box - 03", "Glove Box - 04", "Glove Box - 05", 
    "Cluster Tool", "Inline cluster Tool", "Slot-die Coating", "Laser Scriber", 
    "spray Pyrolysis", "Thickness Monitor Dektak", "Laminator and climate chamber", "Sputtering System", 
    "Cluster Tool chamber 4 - Sputtering", "Atomic Layer Deposition (ALD)", "Closed Space Sublimation (CSS)"
  ],
  "Wet Laboratory": [
    "Laminar Air Flow (LAF)", "Plasma Asher", "Muffle Furnace", "Uv-Ozone cleaner", "Spin Coater", "Hot Plate", "Oven"
  ],
  "Characterisation Laboratory": [
    "Uv-Vis Spectrophotometer", "Oriel Solar Simulator", "Enlitech Solar Simulator", 
    "Enlitech EQE Measurement", "Four-Probe Measurement Setup"
  ]
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Dropdown States for Lab and Instrument
  const [selectedLab, setSelectedLab] = useState("Fabrication Laboratory");
  const [selectedInstrument, setSelectedInstrument] = useState(labData["Fabrication Laboratory"][0]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchBookings();
    }
  }, [isLoggedIn]);

  const fetchBookings = () => {
    fetch(`${API_BASE_URL}/api/bookings`)
      .then(res => res.json())
      .then(data => {
        const formatted = data.map(b => ({
          id: b._id,
          instrument: b.instrument,
          title: b.title,
          start: new Date(b.start),
          end: new Date(b.end),
          userEmail: b.userEmail
        }));
        setEvents(formatted);
      })
      .catch(err => console.error("Error fetching bookings:", err));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      setIsLoggedIn(true);
      setCurrentUser(data.user);
      alert("Login Successful!");
    })
    .catch(err => alert(err.message));
  };

  const handleRegister = (e) => {
    e.preventDefault();
    fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      alert(data.message);
      setAuthMode('login');
    })
    .catch(err => alert(err.message));
  };

  // Jab lab change ho, toh us lab ka pehla instrument default select ho jaye
  const handleLabChange = (e) => {
    const newLab = e.target.value;
    setSelectedLab(newLab);
    setSelectedInstrument(labData[newLab][0]);
  };

  const handleSelectSlot = (slotInfo) => {
    // TIME VALIDATION (Min 30 min, Max 4 hours)
    const durationInMinutes = (slotInfo.end - slotInfo.start) / (1000 * 60);
    
    if (durationInMinutes < 30) {
      alert("Minimum booking slot time is 30 minutes. Please select a larger time range.");
      return;
    }
    
    if (durationInMinutes > 240) { // 4 hours = 240 minutes
      alert("Maximum booking slot time is 4 hours. You cannot book an instrument for more than 4 hours at once.");
      return;
    }

    const reason = window.prompt(`Book ${selectedInstrument} for (${currentUser.name}): Enter purpose/title:`);
    if (!reason) return;

    const newBooking = {
      instrument: selectedInstrument,
      title: `${currentUser.name} - ${reason}`,
      start: slotInfo.start,
      end: slotInfo.end,
      userEmail: currentUser.email
    };

    fetch(`${API_BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBooking)
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Booking failed");
      alert(data.message);
      fetchBookings();
    })
    .catch(err => alert(err.message));
  };

  // Right-Click Cancellation with Authorization Check
  const handleRightClickEvent = (eventDetails, e) => {
    e.preventDefault();
    
    if (currentUser.email !== eventDetails.userEmail) {
      alert("Unauthorized Action! You can only cancel your own bookings.");
      return;
    }

    const confirmCancel = window.confirm(`Do you want to cancel your booking for: ${eventDetails.title}?`);
    if (confirmCancel) {
      fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventDetails)
      })
      .then(async res => {
        if (!res.ok) throw new Error("Cancellation failed");
        alert("Booking cancelled successfully!");
        fetchBookings();
      })
      .catch(err => alert(err.message));
    }
  };

  const CustomEvent = ({ event }) => (
    <div onContextMenu={(e) => handleRightClickEvent(event, e)} style={{ height: '100%', width: '100%' }}>
      {event.title}
    </div>
  );

  const filteredEvents = events.filter(e => e.instrument === selectedInstrument);

  const minTime = new Date();
  minTime.setHours(0, 0, 0, 0);
  const maxTime = new Date();
  maxTime.setHours(23, 59, 59, 999);

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f4f7f6', display: 'flex', flexDirection: 'column' }}>
        <header style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '26px', color: 'white' }}>Tandem Solar Cell Laboratory Slot Booking</h2>
          <div style={{ display: 'flex', gap: '20px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
            <span onClick={() => setAuthMode('login')} style={{ borderBottom: authMode === 'login' ? '2px solid white' : 'none', paddingBottom: '2px' }}>Login</span>
            <span onClick={() => setAuthMode('register')} style={{ borderBottom: authMode === 'register' ? '2px solid white' : 'none', paddingBottom: '2px' }}>Register</span>
            <span onClick={() => setAuthMode('forgot')} style={{ borderBottom: authMode === 'forgot' ? '2px solid white' : 'none', paddingBottom: '2px' }}>Forgot Password</span>
          </div>
        </header>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', width: '350px' }}>
            
            {authMode === 'login' && (
              <form onSubmit={handleLogin}>
                <h3 style={{ marginTop: 0, color: '#1e3a8a' }}>User Login</h3>
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
                <button type="submit" style={btnStyle}>Login</button>
              </form>
            )}

            {authMode === 'register' && (
              <form onSubmit={handleRegister}>
                <h3 style={{ marginTop: 0, color: '#1e3a8a' }}>Register Account</h3>
                <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
                <button type="submit" style={btnStyle}>Register</button>
              </form>
            )}

            {authMode === 'forgot' && (
              <div>
                <h3 style={{ marginTop: 0, color: '#1e3a8a' }}>Reset Password</h3>
                <p style={{ fontSize: '14px', color: '#666' }}>Enter your registered email:</p>
                <input type="email" placeholder="Enter your email" style={inputStyle} />
                <button onClick={() => alert("Password reset link sent to email!")} style={btnStyle}>Send Reset Link</button>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: '15px', marginBottom: '20px' }}>
        <h1 style={{ color: '#1e3a8a', margin: 0, fontSize: '28px' }}>Tandem Solar Cell Laboratory Slot Booking</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontWeight: 'bold', color: '#374151' }}>Welcome, {currentUser.name}</span>
          <button onClick={() => setIsLoggedIn(false)} style={{ padding: '8px 15px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
        </div>
      </header>

      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div>
          <strong style={{ color: '#4b5563', marginRight: '10px' }}>Select Laboratory:</strong>
          <select 
            value={selectedLab} 
            onChange={handleLabChange}
            style={{ padding: '8px 12px', fontSize: '16px', borderRadius: '5px', border: '1px solid #d1d5db', cursor: 'pointer', outline: 'none' }}
          >
            {Object.keys(labData).map(lab => (
              <option key={lab} value={lab}>{lab}</option>
            ))}
          </select>
        </div>

        <div>
          <strong style={{ color: '#4b5563', marginRight: '10px' }}>Select Instrument:</strong>
          <select 
            value={selectedInstrument} 
            onChange={(e) => setSelectedInstrument(e.target.value)}
            style={{ padding: '8px 12px', fontSize: '16px', borderRadius: '5px', border: '1px solid #d1d5db', cursor: 'pointer', outline: 'none' }}
          >
            {labData[selectedLab].map(inst => (
              <option key={inst} value={inst}>{inst}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0, color: '#374151' }}>Calendar for: <span style={{ color: '#2563eb' }}>{selectedInstrument}</span></h3>
        <p style={{ fontSize: '13px', color: '#6b7280' }}>
          24-hour slots are available. Select a slot to book. <strong>Right-Click on your booked slot to cancel it.</strong> (Minimum: 30 mins, Maximum: 4 hours)
        </p>
        
        <div style={{ height: '70vh' }}>
          <Calendar
            localizer={localizer}
            events={filteredEvents}
            startAccessor="start"
            endAccessor="end"
            defaultView="week"
            selectable={true}
            onSelectSlot={handleSelectSlot}
            components={{ event: CustomEvent }}
            min={minTime}
            max={maxTime}
            step={30}         /* Added: 30 minute grid */
            timeslots={1}     /* Added: Each timeslot is 30 mins */
          />
        </div>
      </div>
    </div>
  );
}

const inputStyle = { 
  width: '100%', 
  padding: '10px', 
  margin: '10px 0', 
  borderRadius: '5px', 
  border: '1px solid #d1d5db', 
  boxSizing: 'border-box' 
};

// Login Button Color Darkened to '#0a1930'
const btnStyle = { 
  width: '100%', 
  padding: '10px', 
  backgroundColor: '#0a1930', 
  color: 'white', 
  border: 'none', 
  borderRadius: '5px', 
  cursor: 'pointer', 
  fontWeight: 'bold', 
  marginTop: '10px' 
};

export default App;