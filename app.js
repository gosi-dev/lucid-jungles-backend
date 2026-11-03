const express = require('express');
const app = express();
const dotenv = require('dotenv').config();
const compression = require('compression');
const cors = require('cors')
const path = require('path');
const bodyparser = require('body-parser');

// Keep server alive even if MongoDB (or other non-critical deps) fail
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (non-fatal):', err.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection (non-fatal):', reason?.message || reason);
});

// Gzip/Brotli compression — compress all text responses (HTML, JS, CSS, JSON)
app.use(compression());

app.use(express.static(path.join(__dirname, 'public')));
// Serve the OG frontend (Vite build) at the root
app.use(express.static(path.join(__dirname, '../original-frontend')));
app.use(cors({
  origin: true, // Allow requests from any origin
  methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD"],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));


// Removed manual CORS header block to avoid overriding cors middleware
// app.use(function(req, res, next) {
//   var allowedOrigins = ["https://lucidjungles.io", "https://mojxu.lucidjungles.io"];
//   var acceptedOrigin = allowedOrigins.indexOf(req.headers.origin) >= 0 ? req.headers.origin : allowedOrigins[0];
//   res.header("Access-Control-Allow-Origin", acceptedOrigin);
//   res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
//   res.setHeader('Access-Control-Allow-Credentials', true);
//   next();
// });
app.use(express.json({ limit: '50mb' }));;
app.use(bodyparser.json());

// ── Portfolio: mount BEFORE session/DB so it works offline (zero MongoDB) ──
const { portfolioRouter } = require('./src/routes/portfolio');
app.use('/cappuccinostudiox', portfolioRouter);

const { createSession } = require('./src/utils/session');
app.use(createSession);

let PORT = process.env.PORT || 3000;

try {
  require('./src/repositories/database');
} catch (dbErr) {
  console.warn('DB connection failed (non-fatal):', dbErr.message || dbErr);
}
/*
app.use(function (req, res, next) {
  
  res.setHeader('Access-Control-Allow-Origin', "https://lucidjungles.io");
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Origin,X-Requested-With,content-type,set-cookie');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});
*/



const { index } = require('./src/routes/index');
index(app);

const User = require('./src/models/user');


app.use(async (req, res, next) => {
  //console.log(req.session)
  if (req.session) {
    if (!req.session.lastVisitDate) {
      // Initialize lastVisitDate if it doesn't exist
      req.session.lastVisitDate = new Date().toISOString();
    }
  
    const lastVisitDate = new Date(req.session.lastVisitDate);
    const today = new Date();
    const daysDiff = Math.floor((today - lastVisitDate) / (1000 * 60 * 60 * 24));

    if (daysDiff > 1) {
      // Reset streak to zero
      req.session.loginStreak = 0;
    } else if (daysDiff === 1) {
      // Increment streak only if visit was yesterday (becomes 1)
      req.session.loginStreak = 1;
    } else {
      // No change to streak if visit is today (streak remains the same)
    }
  
    // Save streak to database (similar to existing code)
    
      const user_id = req.session.user;
      if (user_id) {
        const user = await User.findOneAndUpdate(
          { _id: user_id },
          { $set: { loginStreak: req.session.loginStreak }, lastVisitDate: today },
          { upsert: true, new: true }
        );
        req.session.loginStreak = user.loginStreak;
      }
    
      //console.error('Error updating login streak:', err);
    
  
    // Update lastVisitDate (same as existing code)
    req.session.lastVisitDate = new Date().toISOString();
  } else {
    // Handle case where session or user information is missing (same as existing code)
    console.log('Session or user information missing.');
  }
  next();
});
// 404 Error Handler
app.all('*', (req, res) => {
  // If this looks like a browser navigation (not an API call), serve the SPA
  const isApi = req.path.startsWith('/api') || req.path.startsWith('/cappuccinostudiox');
  if (!isApi && req.accepts('html')) {
    return res.sendFile(path.join(__dirname, '../original-frontend/index.html'));
  }
  res.status(404).json({
    status: false,
    error: 'And Just Like That, You Completely Lost Your Way 😥',
  });
});

// Global error handler — catches next(err) calls (e.g. connect-mongo session
// failures when MongoDB is unreachable) and prevents raw stack traces reaching
// the browser.
app.use((err, req, res, next) => {
  console.error('Express error handler:', err.message || err);
  const isApi = req.path.startsWith('/api') || req.path.startsWith('/cappuccinostudiox');
  if (!isApi && req.accepts('html')) {
    // For browser navigation, just serve the SPA — the frontend handles it
    return res.sendFile(path.join(__dirname, '../original-frontend/index.html'));
  }
  if (res.headersSent) return;
  res.status(500).json({ status: false, message: 'Internal server error. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`
Server is running on port ${PORT}
http://localhost:${PORT}
`);
});




