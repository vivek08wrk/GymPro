const axios = require('axios');

const INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID;
const TOKEN = process.env.GREEN_API_TOKEN;
const BASE_URL = `https://api.green-api.com/waInstance${INSTANCE_ID}`;

// WhatsApp pe message bhejo
const sendMessage = async (phone, message) => {
  try {
    // Phone number format — India ke liye 91 prefix
    const chatId = `91${phone}@c.us`;

    const response = await axios.post(
      `${BASE_URL}/sendMessage/${TOKEN}`,
      {
        chatId,
        message
      }
    );

    console.log(`✅ WhatsApp message sent to ${phone}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to send WhatsApp message to ${phone}:`, error.message);
    throw error;
  }
};

// Welcome message — naaya member join kare toh (with QR code)
const sendWelcomeMessage = async (member) => {
  try {
    const message = `Welcome to our gym, ${member.name}! 🎉\n\nYour membership is active until ${new Date(member.expiryDate).toLocaleDateString('en-IN')}.\n\nStay consistent and keep pushing! 💪`;
    
    // Send welcome text
    await sendMessage(member.phone, message);
    
    // Send QR code image
    if (member.qrCode) {
      await sendQRImage(member.phone, member.qrCode, "Your Gym QR Code 💪");
    }
  } catch (error) {
    console.error(`❌ Error in sendWelcomeMessage for ${member.name}:`, error.message);
    // Don't throw - continue even if image fails
  }
};

// Expiry reminder — 7 din pehle
const sendExpiryReminder = async (member, daysLeft) => {
  try {
    const message = `Hi ${member.name}! ⏰\n\nYour gym membership expires in ${daysLeft} days (${new Date(member.expiryDate).toLocaleDateString('en-IN')}).\n\nRenew now to keep your streak going! 💪`;
    
    // Send reminder text
    await sendMessage(member.phone, message);
    
    // Send QR code (if available)
    if (member.qrCode) {
      await sendQRImage(member.phone, member.qrCode, "Your Gym QR Code 💪");
    }
  } catch (error) {
    console.error(`❌ Error in sendExpiryReminder for ${member.name}:`, error.message);
  }
};

// Expired message
const sendExpiredMessage = async (member) => {
  try {
    const message = `Hi ${member.name}! 😔\n\nYour gym membership has expired.\n\nCome back and renew your membership — we miss you! 💪`;
    await sendMessage(member.phone, message);
  } catch (error) {
    console.error(`❌ Error in sendExpiredMessage for ${member.name}:`, error.message);
  }
};

// Motivational message — Week 6 AI agent use karega
const sendMotivationalMessage = async (member, message) => {
  try {
    await sendMessage(member.phone, message);
  } catch (error) {
    console.error(`❌ Error sending motivational message to ${member.name}:`, error.message);
  }
};

const sendQRImage = async (phone, imageUrl, caption = "Your QR Code") => {
  try {
    // Validate imageUrl
    if (!imageUrl) {
      throw new Error('No image URL provided');
    }

    // Ensure it's a public URL (should be Cloudinary URL starting with https://)
    if (!imageUrl.startsWith('http')) {
      throw new Error(`Invalid image URL format: ${imageUrl.substring(0, 50)}...`);
    }

    const chatId = `91${phone}@c.us`;

    console.log(`📤 Sending QR image to ${phone}...`);

    const response = await axios.post(
      `${BASE_URL}/sendFileByUrl/${TOKEN}`,
      {
        chatId,
        urlFile: imageUrl,
        fileName: 'gym-qr.png',
        caption: caption
      }
    );

    console.log(`✅ QR image sent successfully to ${phone}`);
    return response.data;

  } catch (error) {
    console.error(`❌ Failed to send QR image to ${phone}:`, error.message);
    if (error.response?.data) {
      console.error('Green API Error:', error.response.data);
    }
    throw error;
  }
};
module.exports = {
  sendMessage,
  sendWelcomeMessage,
  sendExpiryReminder,
  sendExpiredMessage,
  sendMotivationalMessage,
  sendQRImage 
};