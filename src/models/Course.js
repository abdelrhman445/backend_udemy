const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true }, // حقل الرابط الفريد
    image: { type: String },
    description: { type: String },
    udemyLink: { type: String, required: true, unique: true },
    category: { type: String, default: 'General' },
    isFree: { type: Boolean, default: true },
    addedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', courseSchema);