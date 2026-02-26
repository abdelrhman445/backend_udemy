const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false }, 
    role: { 
        type: String, 
        enum: ['user', 'admin'], 
        default: 'user' 
    },
    otp: { type: String }, 
    otpExpires: { type: Date } 
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);