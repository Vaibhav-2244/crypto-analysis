const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session'); 
const multer = require('multer');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname));

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root123',
  database: 'data'
});

app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the database successfully...');
});

// Multer setup for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.post('/', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  connection.query(query, [username, password], (err, results) => {
    if (err) {
      console.error('Error querying the database:', err);
      res.status(500).send('Error logging in');
    } else if (results.length > 0) {
      req.session.username = username;
      res.redirect('/home');
    } else {
      res.send('Invalid username or password...');
    }
  });
});

app.get('/home', (req, res) => {
  if (!req.session.username) {
    res.redirect('/');
    return;
  }
  res.sendFile(__dirname + '/home.html');
});

app.get('/signup', (req, res) => {
  res.sendFile(__dirname + '/signup.html');
});

app.post('/signup', (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (!username || username.trim() === '') {
    res.send('Username is required');
    return;
  }

  if (password !== confirmPassword) {
    res.send('Passwords do not match');
    return;
  }

  connection.query('SELECT 1 FROM users WHERE username = ?', [username], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error checking for duplicate username');
    } else if (results.length > 0) {
      res.status(400).send('Username already exists...');
    } else {
      if (!email || email === '') {
        res.status(400).send('Enter a valid email address...');
        return;
      }

      connection.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, password], (error) => {
        if (error) {
          console.error('Error inserting into database:', error);
          res.status(500).send('Error creating account...');
        } else {
          res.sendFile(__dirname + '/login.html');
        }
      });
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    } else {
      res.redirect('/');
    }
  });
});

app.get('/profile', (req, res) => {
    if (!req.session.username) {
      res.redirect('/');
      return;
    }
  
    const username = req.session.username;
    const query = 'SELECT * FROM user_profile WHERE username = ?';
    connection.query(query, [username], (err, results) => {
      if (err) {
        console.error('Error fetching profile data:', err);
        res.status(500).send('Error loading profile data.');
      } else if (results.length > 0) {
        // Sending profile data as JSON to be handled on the frontend
        res.json(results[0]);
      } else {
        res.json(null); // No profile data exists
      }
    });
  });
  
  app.post('/profile', upload.single('profilePic'), (req, res) => {
    const { name, username, email, bio, gender } = req.body;
    const profilePic = req.file ? req.file.buffer : null;
  
    const query = `
      INSERT INTO user_profile (username, name, email, bio, gender, profile_pic)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        bio = VALUES(bio),
        gender = VALUES(gender),
        profile_pic = VALUES(profile_pic)
    `;
  
    connection.query(query, [username, name, email, bio, gender, profilePic], (error) => {
      if (error) {
        console.error('Error inserting or updating profile:', error);
        res.status(500).send('Error saving profile.');
      } else {
        res.send('Profile saved successfully.');
      }
    });
  });
  
  
  app.get('/get-profile-data', (req, res) => {
    if (!req.session.username) {
      return res.status(401).json({ error: 'Not logged in' });
    }
  
    const username = req.session.username;
    const query = 'SELECT name, username, email, bio, gender, profile_pic FROM user_profile WHERE username = ?';
  
    connection.query(query, [username], (err, results) => {
      if (err) {
        console.error('Error fetching profile data:', err);
        return res.status(500).json({ error: 'Error loading profile data.' });
      }
  
      if (results.length > 0) {
        const profile = results[0];
        // Convert the profile picture from buffer to base64
        profile.profile_pic = profile.profile_pic ? profile.profile_pic.toString('base64') : null;
        res.json(profile);
      } else {
        res.json(null); // No profile data found
      }
    });
  });
  
  app.post('/contact', (req, res) => {
    const { name, email, message } = req.body;
    
    const query = 'INSERT INTO contact (name, email, message) VALUES (?, ?, ?)';
    
    connection.query(query, [name, email, message], (err, results) => {
      if (err) {
        console.error('Error inserting into the contact table:', err);
        res.status(500).send('Error saving contact information.');
      } else {
        res.send('Your message has been sent successfully.');
      }
    });
  });


app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
