const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// ✅ التصحيح هنا: التأكد من المسار الصحيح للميدل وير لضمان الأمان
const authMiddleware = require('../middlewares/authMiddleware'); 

// مسارات المصادقة الأساسية
router.post('/register', authController.signup);
router.post('/verify-otp', authController.verifyOTP);
router.post('/login', authController.login);

// مسارات الإعدادات المحمية
// تم ربط هذا الطريق بالمتحكم المحدث الذي يطلب الباسورد الحالي والجديد
router.put('/update', authMiddleware, authController.updateUser);

// مسار حذف الحساب نهائياً
router.delete('/delete', authMiddleware, authController.deleteUser);

module.exports = router;