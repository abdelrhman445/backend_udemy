// 1. التعريفات الأساسية
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');

// 2. دالة إنشاء الحساب (Signup)
// تم الحفاظ على منطق الـ OTP والأمان الأصلي مع تسريع الاستجابة
exports.signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // التحقق من وجود المستخدم مسبقاً لمنع التكرار
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: "المستخدم موجود بالفعل" });

        // تشفير كلمة المرور (Hashing) لضمان الأمان
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // إنشاء كود تفعيل عشوائي وصلاحية لـ 10 دقائق
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000;

        // إنشاء الكائن (بدون حقل Role)
        user = new User({
            username,
            email,
            password: hashedPassword,
            otp,
            otpExpires
        });

        await user.save();
        
        // التحديث: إرسال الكود في الخلفية (بدون await) لمنع تعليق السيرفر وضمان سرعة الرد
        emailService.sendOTP(email, otp).catch(err => {
            console.error("خطأ في إرسال الإيميل (خلفية):", err.message);
        });

        return res.status(201).json({ msg: "تم إنشاء الحساب، يرجى التحقق من بريدك الإلكتروني" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. دالة التحقق من الكود (Verify OTP)
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ msg: "مستخدم غير موجود" });
        
        // التحقق من صحة الكود وصلاحيته الزمنية
        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ msg: "كود غير صحيح أو انتهت صلاحيته" });
        }

        // تفعيل الحساب وتصفير بيانات الـ OTP
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.status(200).json({ msg: "تم تفعيل الحساب بنجاح، يمكنك تسجيل الدخول الآن" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. دالة تسجيل الدخول (Login)
// ✅ التحديث: تم إزالة كل ما يتعلق بالـ Admin Role
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        // حماية أمنية: لا نخبر المخترق أي جزء تحديداً هو الخاطئ
        if (!user) return res.status(400).json({ msg: "بيانات الدخول غير صحيحة" });
        
        // التأكد من تفعيل الحساب عبر الإيميل
        if (!user.isVerified) return res.status(401).json({ msg: "يرجى تفعيل الحساب أولاً" });

        // مقارنة الباسورد المشفر
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "بيانات الدخول غير صحيحة" });

        // إنشاء التوكن (JWT) بالـ ID فقط لضمان الخفة والأمان
        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // إرجاع البيانات الأساسية فقط للفرونت إند
        res.json({
            token,
            user: { 
                id: user._id, 
                username: user.username 
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 5. دالة تحديث بيانات المستخدم (الإعدادات)
// ✅ التعديل الأمني: إضافة التحقق من الباسورد الحالي
exports.updateUser = async (req, res) => {
    const { username, currentPassword, newPassword } = req.body; // استلام الحقول الجديدة
    try {
        // req.user.id يأتي من authMiddleware المحمي
        let user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: "المستخدم غير موجود" });

        // التحقق الفعلي من كلمة المرور الحالية قبل أي تحديث
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ msg: "كلمة المرور الحالية غير صحيحة" });

        if (username) user.username = username;

        // إعادة تشفير الباسورد الجديد في حال تغييره
        if (newPassword) {
            user.password = await bcrypt.hash(newPassword, 10);
        }

        await user.save();
        res.json({ 
            msg: "تم تحديث البيانات بنجاح", 
            username: user.username 
        });
    } catch (err) {
        res.status(500).json({ error: "خطأ في تحديث البيانات" });
    }
};

// 6. دالة حذف الحساب نهائياً
exports.deleteUser = async (req, res) => {
    try {
        const { password } = req.body; // استلام الباسورد من الفرونت إند
        
        if (!password) {
            return res.status(400).json({ msg: "يرجى تقديم كلمة المرور لتأكيد الحذف" });
        }

        // 1. العثور على المستخدم
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: "المستخدم غير موجود" });

        // 2. التحقق من صحة الباسورد (عضلات النظام)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ msg: "كلمة المرور غير صحيحة. عملية الحذف مرفوضة." });
        }

        // 3. الحذف النهائي
        await User.findByIdAndDelete(req.user.id);
        
        res.json({ msg: "تم حذف الحساب نهائياً، نتمنى رؤيتك قريباً" });
    } catch (err) {
        console.error("Delete Error:", err.message);
        res.status(500).json({ error: "حدث خطأ داخلي أثناء حذف الحساب" });
    }
};