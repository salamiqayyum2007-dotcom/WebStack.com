require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// --- database setup ---
const dbPath = path.join(__dirname, 'db.sqlite');
const db = new sqlite3.Database(dbPath);

// promisified helpers
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}
function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}
function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// initialize tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      fullname TEXT,
      location TEXT,
      bio TEXT,
      website TEXT,
      joinedDate TEXT,
      enrolled TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS codes (
      code TEXT PRIMARY KEY,
      email TEXT,
      expires INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT,
      level TEXT,
      duration TEXT,
      description TEXT,
      price REAL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_progress (
      userId INTEGER,
      exerciseId TEXT,
      code TEXT,
      status TEXT,
      points INTEGER,
      savedAt TEXT,
      PRIMARY KEY(userId, exerciseId)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      userId INTEGER PRIMARY KEY,
      points INTEGER,
      completedExercises INTEGER,
      lastUpdated TEXT
    )
  `);

  // seed courses if empty
  db.get('SELECT COUNT(*) AS cnt FROM courses', [], (err, row) => {
    if (!err && row && row.cnt === 0) {
      const stmt = db.prepare(
        'INSERT INTO courses (id,title,level,duration,description,price) VALUES (?,?,?,?,?,?)'
      );
      const courseData = [
        ['html', '🌐 HTML - Fundamentals', 'Beginner', '4 weeks', 'Learn the structure of the web. Master HTML5 tags, semantic elements, forms, and best practices. This course covers everything you need to know to create well-structured web pages.', 29],
        ['css', '🎨 CSS - Styling & Layout', 'Beginner', '6 weeks', 'Style your websites beautifully with CSS. Learn flexbox, CSS Grid, responsive design, animations, and modern layout techniques. Transform your HTML into stunning visual designs.', 49],
        ['javascript', '⚡ JavaScript - Interactive Web', 'Intermediate', '8 weeks', 'Make your websites interactive and dynamic. Learn DOM manipulation, events, ES6+ features, async programming, and build real-world projects. Master the language of the web.', 59],
        ['react', '⚛️ React - Modern Framework', 'Intermediate', '8 weeks', 'Build modern web applications with React. Learn components, hooks, state management, routing, and create scalable single-page applications.', 79],
        ['python', '🐍 Python - Backend Development', 'Intermediate', '10 weeks', 'Learn Python for backend development. Master Django, databases, APIs, and full-stack web development with Python.', 69],
        ['tools', '📦 Web Development Tools', 'Intermediate', '4 weeks', 'Master Git, GitHub, npm, webpack, and other essential development tools. Learn version control and project management workflows.', 39]
      ];
      courseData.forEach(c => stmt.run(c));
      stmt.finalize();
    }
  });
});

// convenience for sending mail
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Authentication & user endpoints
app.post('/api/register', async (req, res) => {
  const { email, password, fullname } = req.body;
  if (!email || !password || !fullname) {
    return res.status(400).json({ error: 'email, password and fullname required' });
  }
  try {
    const existing = await getAsync('SELECT id FROM users WHERE email=?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const joinedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const result = await runAsync(
      'INSERT INTO users (email,password,fullname,joinedDate,enrolled) VALUES (?,?,?,?,?)',
      [email, password, fullname, joinedDate, JSON.stringify([])]
    );
    const id = result.lastID;
    res.json({ success: true, user: { id, email, fullname, joinedDate } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }
  try {
    const u = await getAsync('SELECT * FROM users WHERE email=? AND password=?', [email, password]);
    if (u) {
      res.json({
        success: true,
        user: {
          id: u.id,
          email: u.email,
          fullname: u.fullname,
          enrolled: JSON.parse(u.enrolled || '[]'),
          joinedDate: u.joinedDate || ''
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users/:userId', async (req, res) => {
  try {
    const u = await getAsync('SELECT * FROM users WHERE id=?', [req.params.userId]);
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: u.id,
      email: u.email,
      fullname: u.fullname,
      enrolled: JSON.parse(u.enrolled || '[]'),
      location: u.location || '',
      bio: u.bio || '',
      website: u.website || '',
      joinedDate: u.joinedDate || ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users/:userId', async (req, res) => {
  const { fullname, location, bio, website } = req.body;
  try {
    const u = await getAsync('SELECT * FROM users WHERE id=?', [req.params.userId]);
    if (!u) return res.status(404).json({ error: 'User not found' });
    const updated = {
      fullname: fullname !== undefined ? fullname : u.fullname,
      location: location !== undefined ? location : u.location,
      bio: bio !== undefined ? bio : u.bio,
      website: website !== undefined ? website : u.website
    };
    await runAsync(
      'UPDATE users SET fullname=?, location=?, bio=?, website=? WHERE id=?',
      [updated.fullname, updated.location, updated.bio, updated.website, req.params.userId]
    );
    const refreshed = await getAsync('SELECT * FROM users WHERE id=?', [req.params.userId]);
    res.json({
      success: true,
      user: {
        id: refreshed.id,
        email: refreshed.email,
        fullname: refreshed.fullname,
        enrolled: JSON.parse(refreshed.enrolled || '[]'),
        location: refreshed.location,
        bio: refreshed.bio,
        website: refreshed.website
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Course endpoints
app.get('/api/courses', async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM courses');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/enroll', async (req, res) => {
  const { userId, courseId } = req.body;
  if (!userId || !courseId) return res.status(400).json({ error: 'userId and courseId required' });
  try {
    const user = await getAsync('SELECT * FROM users WHERE id=?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const course = await getAsync('SELECT * FROM courses WHERE id=?', [courseId]);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const enrolled = JSON.parse(user.enrolled || '[]');
    if (!enrolled.includes(courseId)) {
      enrolled.push(courseId);
      await runAsync('UPDATE users SET enrolled=? WHERE id=?', [JSON.stringify(enrolled), userId]);
    }
    // send email
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
    res.json({ success: true, enrolled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Exercise endpoints
app.post('/api/exercises/save-progress', async (req, res) => {
  const { userId, exerciseId, code, status, points } = req.body;
  if (!userId || !exerciseId) {
    return res.status(400).json({ error: 'userId and exerciseId required' });
  }
  try {
    await runAsync(
      `INSERT OR REPLACE INTO user_progress (userId, exerciseId, code, status, points, savedAt) VALUES (?,?,?,?,?,?)`,
      [userId, exerciseId, code, status, points, new Date().toISOString()]
    );
    const rows = await allAsync('SELECT points, status FROM user_progress WHERE userId=?', [userId]);
    const totalPoints = rows.reduce((sum, r) => sum + (r.points || 0), 0);
    const completed = rows.filter(r => r.status === 'completed').length;
    await runAsync(
      `INSERT OR REPLACE INTO leaderboard (userId, points, completedExercises, lastUpdated) VALUES (?,?,?,?)`,
      [userId, totalPoints, completed, new Date().toISOString()]
    );
    res.json({ success: true, totalPoints, message: 'Progress saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/exercises/progress/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const rows = await allAsync('SELECT * FROM user_progress WHERE userId=?', [userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM leaderboard ORDER BY points DESC LIMIT 20');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/leaderboard/rank/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const stats = await getAsync('SELECT * FROM leaderboard WHERE userId=?', [userId]);
    if (!stats) {
      return res.status(404).json({ error: 'User not found' });
    }
    const all = await allAsync('SELECT userId FROM leaderboard ORDER BY points DESC');
    const rank = all.findIndex(r => String(r.userId) === String(userId)) + 1;
    res.json({ ...stats, rank, totalUsers: all.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/send-reset-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: false, message: 'Email required' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 1000 * 60 * 15; // 15 minutes
  try {
    await runAsync('INSERT INTO codes (code,email,expires) VALUES (?,?,?)', [code, email, expires]);
  } catch (err) {
    console.error('DB error inserting code', err);
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Your WebStack password reset code',
    text: `Your password reset code is: ${code}. It expires in 15 minutes.`
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.json({ success: true });
  } catch (err) {
    console.error('Mail send error', err);
    return res.json({ success: false, message: 'Failed to send email' });
  }
});

app.post('/verify-reset-code', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword)
    return res.json({ success: false, message: 'Missing fields' });
  try {
    const entry = await getAsync('SELECT * FROM codes WHERE code=?', [code]);
    if (!entry || entry.email !== email || entry.expires < Date.now()) {
      return res.json({ success: false, message: 'Invalid or expired code' });
    }
    await runAsync('DELETE FROM codes WHERE code=?', [code]);
    // update password in users table if desired (hashed in real setup)
    // await runAsync('UPDATE users SET password=? WHERE email=?', [newPassword, email]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.listen(PORT, () => console.log('Reset server listening on', PORT));
