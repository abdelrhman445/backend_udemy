require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');

// استدعاء خدمة الاقتناص
const { scrapeTutorialBar } = require('./src/services/scraperService');

// استدعاء المسارات
const authRoutes = require('./src/routes/authRoutes');
const courseRoutes = require('./src/routes/courseRoutes');

const app = express();

// ✅ إعدادات الـ CORS لضمان التواصل بين الفرونت إند والباك إند
app.use(cors({
  origin: '*', // يسمح بالوصول من أي مكان (مثالي لـ Hugging Face و Vercel)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({
    status: "online",
    msg: "UDEMYCOUPON Server is flying! 🚀",
    uptime: process.uptime()
  });
});
// ✅ تعريف المسارات الأساسية
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes); // المسار اللي جواه البحث والجلب

// ✅ الاتصال بـ MongoDB وبدء العمل
// ملحوظة: تأكد إن MONGO_URI في ملف الـ .env هو الرابط الجديد للـ Cluster
mongoose
  .connect(process.env.MONGO_URI || process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Successfully');
    
    // تشغيل أول مداهمة للمصادر بمجرد اتصال القاعدة لملء المنجم
    console.log('🚀 جاري بدء عملية الاقتناص الأولى لتنشيط المنجم...');
    scrapeTutorialBar(); 
  })
  .catch((err) => console.error('❌ DB Connection Error:', err));

// ✅ جدولة المحرك الكاسر (Cron Job) كل 5 دقائق
cron.schedule('*/5 * * * *', () => {
  console.log('⏰ [Cron Job] جاري تحديث المنجم بالكورسات الجديدة الآن...');
  scrapeTutorialBar();
});

// التعامل مع المسارات غير الموجودة (لمنع الـ 404 العشوائي)
app.use((req, res) => {
  res.status(404).json({ msg: "العنوان اللي بتدور عليه مش موجود في السيرفر يا وحش" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 RILLZO Server is flying on port ${PORT}`);
});