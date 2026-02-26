const Course = require('../models/Course');

// 1. جلب كل الكورسات مرتبة بالأحدث
exports.getAllCourses = async (req, res) => {
    try {
        // استخدمنا addedAt بناءً على تحديثك الأخير في الموديل
        const courses = await Course.find().sort({ addedAt: -1 });
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: "خطأ في جلب الكورسات من المنجم: " + err.message });
    }
};

// 2. محرك البحث الذكي (Regex Search)
exports.searchCourses = async (req, res) => {
    try {
        const { q } = req.query; // استلام كلمة البحث من الرابط
        if (!q) return res.status(400).json({ msg: "فين كلمة البحث يا وحش؟" });

        // البحث في العنوان والوصف مع تجاهل حالة الأحرف (options: 'i')
        const courses = await Course.find({
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ]
        }).limit(20); // تحديد النتائج بـ 20 لضمان سرعة الاستجابة على Hugging Face

        res.json(courses);
    } catch (err) {
        console.error("Search Error:", err);
        res.status(500).json({ error: "فشل في محرك البحث" });
    }
};
// جلب تفاصيل كورس واحد بالـ ID
exports.getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ msg: "الكورس ده فص ملح وداب!" });
        res.json(course);
    } catch (err) {
        res.status(500).json({ error: "خطأ في الوصول للمنجم" });
    }
};