// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // جلب التوكن من هيدر Authorization
    const token = req.header('Authorization');
    
    if (!token) {
        return res.status(401).json({ msg: "no token provided" });
    }

    try {
        // فك التشفير مع دعم تنسيق "Bearer <token>"
        const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
        
        // إرفاق بيانات المستخدم (id, role) بالطلب
        req.user = decoded; 
        next();
    } catch (err) {
        res.status(401).json({ msg: "token is invalid" });
    }
};