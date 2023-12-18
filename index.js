const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Box ,User } = require('./models/User');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;
const jwtSecret = 'anything';


app.use(cors());
app.use(bodyParser.json());

mongoose.connect('mongodb+srv://new:n1e2w3@cluster0.vg2u5rd.mongodb.net/Blog', { useNewUrlParser: true, useUnifiedTopology: true
});
const db = mongoose.connection;
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Set up storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Store photos in the 'uploads' directory
  },
  filename: function (req, file, cb) {
    cb(null, `${req.params.articleId}_${file.originalname}`); // Unique filename
  },
});

const upload = multer({ storage: storage });

// Handle photo upload
// Change from :articleId to :title
app.post('/api/upload-photo/:title', upload.single('photo'), (req, res) => {
  // Save the file details (e.g., filename) in your database
  const photoDetails = {
    title: req.params.title, // Use title instead of articleId
    filename: req.file.filename,
  };

  // Save photoDetails in MongoDB or any other database
  // ...

  res.json({ success: true, message: 'Photo uploaded successfully' });
});



// Middleware to authenticate user
const authenticateUser = (req, res, next) => {
  const token = req.header('x-auth-token');
  console.log('Received token:', token);

  if (!token) {
    return res.status(401).json({ error: 'Authorization denied' });
  }

//   try {
//     const decoded = jwt.verify(token, 'secret');
//     console.log('Decoded user verg:', decoded.user);
//     req.user = decoded.user;
//     next();
try {
    // Decode the token without verification
    const decoded = jwt.decode(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Token is not valid' });
    }

    console.log('Decoded user:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// Registration endpoint
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if the username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare the provided password with the hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate a token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      'jwtSecret',
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
// app.post('/api/login', (req, res) => {
//   const { username, password } = req.body;

//   // Check credentials
//   if (username === dummyUser.username && bcrypt.compareSync(password, dummyUser.password)) {
//     // Generate a token
//     const token = jwt.sign({ userId: dummyUser.id, username: dummyUser.username, role: dummyUser.role}, jwtSecret, { expiresIn: '1h' });
//     res.json({ token });
//   } else {
//     res.status(401).json({ error: 'Invalid credentials' });
//   }
// });

app.get('/api/admin-action', authenticateUser, (req, res) => {
  const user = req.user;
  if (user.role !== 'admin') {
    return res.status(403).json({ msg: 'Permission denied' });
  }

  res.json({ role: user.role, message: 'Admin action successful!' });
});

// Registration endpoint
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  // Hash the password
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  // Save the user (in a real app, you'd store this information in a database)
  const newUser = {
    id: 2,
    username,
    password: hashedPassword,
  };

  res.status(201).json({ message: 'User registered successfully', user: newUser });
});

// Protected endpoint to get user information
app.get('/api/user', authenticateUser, (req, res) => {
    try {
     console.log('Decoded user%:', req.user);
      const { userId, username, role} = req.user;
      res.json({ userId, username, role});
    } catch (error) {
      console.error('Error in /api/user endpoint:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  app.get('/api/get-boxes', async (req, res) => {
    try {
      const boxes = await Box.find();
      res.status(200).json(boxes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get boxes' });
    }
  });

  app.post('/api/add-box', async (req, res) => {
    try {
      const { title, content } = req.body;
      const newBox = new Box({ title, content });
      await newBox.save();
      res.status(200).json(newBox);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add a box' });
    }
  });
  
  app.delete('/api/delete-box/:id', async (req, res) => {
    const bookId = req.params.id;
    try {
      const deletedBook = await Box.findByIdAndDelete(bookId);
  
      if (!deletedBook) {
        res.status(404).json({ error: 'Book not found' });
        return;
      }
  
      res.status(200).json(deletedBook);
    } catch (error) {
      console.error('Error deleting book:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/get-box/:id', async (req, res) => {
    try {
      const boxId = req.params.id;
      const selectedBox = await Box.findById(boxId);
  
      if (!selectedBox) {
        return res.status(404).json({ error: 'Box not found' });
      }
      // Increment views
      selectedBox.views += 1;
      await selectedBox.save();
  
      res.json(selectedBox);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
