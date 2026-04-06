const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  try {
    // Token header mein aata hai — "Bearer <token>"
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token, access denied' });
    }

    const token = authHeader.split(' ')[1];

    // Token verify karo
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // admin info aage controllers mein milegi
    next();             // guard ne pass kar diya — aage jao

  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = { protect };