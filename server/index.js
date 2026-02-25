require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// In‑memory stores for demo purposes
const users = new Map();          // userId -> { id, email, password, fullname, enrolled: [] }
let nextUserId = 1;

const courses = [
  { id: 'html', title: '🌐 HTML - Fundamentals', level: 'Beginner', duration: '4 weeks', description: 'Learn the structure of the web. Master HTML5 tags, semantic elements, forms, and best practices. This course covers everything you need to know to create well-structured web pages.', price: 29 },
  { id: 'css', title: '🎨 CSS - Styling & Layout', level: 'Beginner', duration: '6 weeks', description: 'Style your websites beautifully with CSS. Learn flexbox, CSS Grid, responsive design, animations, and modern layout techniques. Transform your HTML into stunning visual designs.', price: 49 },
  { id: 'javascript', title: '⚡ JavaScript - Interactive Web', level: 'Intermediate', duration: '8 weeks', description: 'Make your websites interactive and dynamic. Learn DOM manipulation, events, ES6+ features, async programming, and build real-world projects. Master the language of the web.', price: 59 },
  { id: 'react', title: '⚛️ React - Modern Framework', level: 'Intermediate', duration: '8 weeks', description: 'Build modern web applications with React. Learn components, hooks, state management, routing, and create scalable single-page applications.', price: 79 },
  { id: 'python', title: '🐍 Python - Backend Development', level: 'Intermediate', duration: '10 weeks', description: 'Learn Python for backend development. Master Django, databases, APIs, and full-stack web development with Python.', price: 69 },
  { id: 'tools', title: '📦 Web Development Tools', level: 'Intermediate', duration: '4 weeks', description: 'Master Git, GitHub, npm, webpack, and other essential development tools. Learn version control and project management workflows.', price: 39 }
];

// Simple in-memory store for codes. For production use a persistent store (Redis, DB).
const codes = new Map();
const userProgress = new Map();
const leaderboard = new Map();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT): 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Authentication & user endpoints
app.post('/api/register', (req, res) => {
  const { email, password, fullname } = req.body;
  if (!email || !password || !fullname) {
    return res.status(400).json({ error: 'email, password and fullname required' });
  }
  // check existing
  for (const u of users.values()) {
    if (u.email === email) {
      return res.status(409).json({ error: 'Email already registered' });
    }
  }
  const id = String(nextUserId++);
  const joinedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const user = { id, email, password, fullname, enrolled: [], joinedDate };
  users.set(id, user);
  res.json({ success: true, user: { id, email, fullname, joinedDate } });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }
  for (const u of users.values()) {
    if (u.email === email && u.password === password) {
      return res.json({ success: true, user: { id: u.id, email: u.email, fullname: u.fullname, enrolled: u.enrolled, joinedDate: u.joinedDate || '' } });
    }
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.get('/api/users/:userId', (req, res) => {
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, email: user.email, fullname: user.fullname, enrolled: user.enrolled, location: user.location || '', bio: user.bio || '', website: user.website || '', joinedDate: user.joinedDate || '' });
});

app.post('/api/users/:userId', (req, res) => {
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { fullname, location, bio, website } = req.body;
  if (fullname !== undefined) user.fullname = fullname;
  if (location !== undefined) user.location = location;
  if (bio !== undefined) user.bio = bio;
  if (website !== undefined) user.website = website;
  users.set(user.id, user);
  res.json({ success: true, user: { id: user.id, email: user.email, fullname: user.fullname, enrolled: user.enrolled, location: user.location, bio: user.bio, website: user.website } });
});

// Course endpoints
app.get('/api/courses', (req, res) => {
  res.json(courses);
});

app.post('/api/enroll', async (req, res) => {
  const { userId, courseId } = req.body;
  if (!userId || !courseId) return res.status(400).json({ error: 'userId and courseId required' });
  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const course = courses.find(c => c.id === courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (!user.enrolled.includes(courseId)) {
    user.enrolled.push(courseId);
  }

  // optionally send confirmation email if transporter configured
  if (transporter && user.email) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: `Enrolled in ${course.title}`,
        text: `Hi ${user.fullname},\n\nYou've been enrolled in ${course.title}. Happy learning!`
      });
    } catch (err) {
      console.error('Failed to send enrollment email', err);
    }
  }

  res.json({ success: true, enrolled: user.enrolled });
});

// Exercise endpoints
app.post('/api/exercises/save-progress', (req, res) => {
  const { userId, exerciseId, code, status, points } = req.body;
  
  if (!userId || !exerciseId) {
    return res.status(400).json({ error: 'userId and exerciseId required' });
  }
  
  if (!userProgress.has(userId)) {
    userProgress.set(userId, {});
  }
  
  const userExercises = userProgress.get(userId);
  userExercises[exerciseId] = {
    code,
    status,
    points,
    savedAt: new Date()
  };
  
  // Update leaderboard
  const totalPoints = Object.values(userExercises).reduce((sum, ex) => sum + (ex.points || 0), 0);
  leaderboard.set(userId, {
    userId,
    points: totalPoints,
    completedExercises: Object.keys(userExercises).filter(id => userExercises[id].status === 'completed').length,
    lastUpdated: new Date()
  });
  
  res.json({ 
    success: true, 
    totalPoints,
    message: 'Progress saved successfully'
  });
});

app.get('/api/exercises/progress/:userId', (req, res) => {
  const { userId } = req.params;
  const progress = userProgress.get(userId) || {};
  res.json(progress);
});

app.get('/api/leaderboard', (req, res) => {
  const sorted = Array.from(leaderboard.values())
    .sort((a, b) => b.points - a.points)
    .slice(0, 20);
  res.json(sorted);
});

app.get('/api/leaderboard/rank/:userId', (req, res) => {
  const { userId } = req.params;
  const userStats = leaderboard.get(userId);
  
  if (!userStats) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const sorted = Array.from(leaderboard.values())
    .sort((a, b) => b.points - a.points);
  
  const rank = sorted.findIndex(u => u.userId === userId) + 1;
  res.json({ 
    ...userStats,
    rank,
    totalUsers: sorted.length
  });
});

app.post('/send-reset-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success:false, message: 'Email required' });

  const code = Math.floor(100000 + Math.random()*900000).toString();
  codes.set(code, { email, expires: Date.now()+1000*60*15 }); // 15 minutes
  setTimeout(() => codes.delete(code), 1000*60*15);

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Your WebStack password reset code',
    text: `Your password reset code is: ${code}. It expires in 15 minutes.`
  };

  try{
    await transporter.sendMail(mailOptions);
    return res.json({ success:true });
  }catch(err){
    console.error('Mail send error', err);
    return res.json({ success:false, message: 'Failed to send email' });
  }
});

app.post('/verify-reset-code', (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.json({ success:false, message: 'Missing fields' });
  const entry = codes.get(code);
  if (!entry) return res.json({ success:false, message: 'Invalid or expired code' });
  if (entry.email !== email) return res.json({ success:false, message: 'Code does not match email' });

  // Code valid — consume it
  codes.delete(code);

  // NOTE: This server does not manage your user database. For sites using a real DB
  // you should lookup the user by email and update their password (hashed) here.
  // This demo simply returns success so the client (which may store demo users in localStorage)
  // can update its local copy. Integrate with your user store to persist the change.

  return res.json({ success:true });
});

app.listen(PORT, () => console.log('Reset server listening on', PORT));
