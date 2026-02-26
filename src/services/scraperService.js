const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const Course = require('../models/Course');
const slugify = require('slugify');

puppeteer.use(StealthPlugin());

/**
 * وظيفة معالجة وتصحيح روابط الصور لضمان الجودة
 */
const fixImageUrl = (url, baseUrl) => {
  if (!url) return "https://via.placeholder.com/300x150?text=Premium+Course";
  if (url.startsWith('/')) {
    const origin = new URL(baseUrl).origin;
    url = origin + url;
  }
  return url.split('?')[0];
};

/**
 * اقتناص الرابط المباشر - نسخة توفير الموارد القصوى
 */
const getDirectLink = async (browser, detailLink, selector) => {
  let detailPage;
  try {
    detailPage = await browser.newPage();
    
    // 🛡️ منع تحميل الصور والملفات الثقيلة لتوفير الرام ومنع الـ Timeout
    await detailPage.setRequestInterception(true);
    detailPage.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media', 'other'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // استخدام domcontentloaded لتقليل وقت الانتظار
    await detailPage.goto(detailLink, { waitUntil: 'domcontentloaded', timeout: 35000 });
        
    const directLink = await detailPage.evaluate((sel) => {
      const btn = document.querySelector(sel);
      if (btn && btn.href) return btn.href;
      const backupBtn = document.querySelector('a[href*="udemy.com"]');
      return backupBtn ? backupBtn.href : null;
    }, selector);

    await detailPage.close();
    return directLink;
  } catch (err) {
    if (detailPage) await detailPage.close();
    return null;
  }
};

/**
 * المحرك الرئيسي المطور للاقتناص الضخم (6 صفحات / 90+ كورس)
 * يحل مشاكل التكرار (Duplicate Key) والـ Timeout
 */
const scrapeTutorialBar = async () => {
  let browser;
  try {
    console.log("🛡️ جاري تشغيل المحرك الكاسر (النسخة النهائية المستقرة)...");
    
    browser = await puppeteer.launch({ 
       headless: "new",
       args: [
         '--no-sandbox', 
         '--disable-setuid-sandbox', 
         '--disable-dev-shm-usage', // حل مشكلة الـ Timeout في Hugging Face
         '--disable-gpu', 
         '--no-zygote',
         '--single-process', 
         '--disable-extensions'
       ]
    });

    const page = await browser.newPage();
    let allDiscoveredCourses = [];

    // 1. جمع البيانات من 6 صفحات
    for (let i = 1; i <= 6; i++) {
      const pageUrl = i === 1 ? "https://couponscorpion.com/" : `https://couponscorpion.com/page/${i}/`;
      console.log(`📡 جاري مسح صفحة رقم (${i})...`);
      
      try {
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
        const pageCourses = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('article')).map(el => {
            const img = el.querySelector('img');
            return {
              title: el.querySelector('h3, h2')?.innerText?.trim(),
              detailLink: el.querySelector('a')?.href,
              image: img?.dataset?.src || img?.dataset?.lazySrc || img?.src
            };
          });
        });
        allDiscoveredCourses = [...allDiscoveredCourses, ...pageCourses];
      } catch (err) {
        console.log(`⚠️ تجاوز الصفحة ${i} بسبب البطء`);
      }
    }

    await page.close();
    console.log(`🔍 تم اكتشاف ${allDiscoveredCourses.length} رابط. جاري المعالجة الذكية...`);

    // 2. المعالجة المتتابعة وحل مشكلة التكرار
    for (const course of allDiscoveredCourses) {
      try {
        if (!course.title || !course.detailLink) continue;
        
        // توليد الـ slug مسبقاً للتحقق
        const currentSlug = slugify(course.title, { lower: true, strict: true });

        // 🔍 فحص مزدوج (العنوان أو الـ Slug) لضمان عدم حدوث Duplicate Key Error
        const exists = await Course.findOne({ 
          $or: [{ title: course.title }, { slug: currentSlug }] 
        });
        
        if (exists) continue; // تخطي الكورس الموجود مسبقاً في صمت

        const directLink = await getDirectLink(browser, course.detailLink, 'a.btn_offer_block.re_track_btn');
        
        if (directLink) {
          await Course.create({
            title: course.title,
            slug: currentSlug,
            image: fixImageUrl(course.image, "https://couponscorpion.com/"),
            udemyLink: directLink,
            category: "Scorpion Global"
          });
          console.log(`✅ تم اقتناص: ${course.title.substring(0, 40)}...`);
        }
        
        // فاصل زمني (1.5 ثانية) للسماح للسيرفر بالرد على المستخدمين
        await new Promise(r => setTimeout(r, 1500));

      } catch (innerError) {
        // حماية المحرك من التوقف في حالة حدوث تكرار مفاجئ أو خطأ في قاعدة البيانات
        if (innerError.code === 11000) {
          console.log(`🟡 تكرار تم تخطيه: ${course.title}`);
        } else {
          console.error(`⚠️ خطأ عابر:`, innerError.message);
        }
        continue;
      }
    }

    console.log("🏁 تم تحديث المنجم بنجاح! السيرفر مستقر تماماً.");
  } catch (error) {
    console.error("❌ خطأ قاتل في المحرك:", error.message);
  } finally {
    if (browser) {
        await browser.close();
        console.log("🧹 تم تنظيف الذاكرة.");
    }
  }
};

module.exports = { scrapeTutorialBar };