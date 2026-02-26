const express = require('express');
const router = express.Router();
const Course = require('../models/Course'); 
const courseController = require('../controllers/courseController');

// ✅ مسار البحث (يجب أن يكون في الأعلى لضمان عدم حدوث 404)
router.get("/search", courseController.searchCourses);

// ✅ مسار جلب كل الدورات
router.get('/all', courseController.getAllCourses);

// ✅ مسار جلب قائمة الأقسام الفريدة
router.get("/categories/list", async (req, res) => {
  try {
    const categories = await Course.distinct("category");
    res.json(categories);
  } catch (err) {
    res.status(500).json({ msg: "خطأ في جلب قائمة الأقسام" });
  }
});

// ✅ مسار جلب كورسات قسم معين
router.get("/category/:name", async (req, res) => {
  try {
    const courses = await Course.find({ category: req.params.name });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ msg: "خطأ في جلب كورسات هذا القسم" });
  }
});
router.get("/:id", courseController.getCourseById);

module.exports = router;