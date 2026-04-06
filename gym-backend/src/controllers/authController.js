const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

// One time only — pehli baar admin account banana
const registerAdmin = async (req, res) => {
  try {
    const adminExists = await Admin.findOne({ username: req.body.username });
    if (adminExists) {
      return res.status(400).json({ success: false, message: 'Admin already exists' });
    }

    const admin = await Admin.create({
      username: req.body.username,
      password: req.body.password
    });

    res.status(201).json({ success: true, message: 'Admin created successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Login — token milega yahan se
const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Token banao — 7 din tak valid rahega
    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { registerAdmin, loginAdmin };