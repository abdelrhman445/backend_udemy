const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const Course = require('../models/Course');
const slugify = require('slugify');

puppeteer.use(StealthPlugin());

const scrapeTutorialBar = async () => {
  let browser;
  try {
    console.log("🛡️ جاري تشغيل المحرك الكاسر (إصدار الاقتناص العميق)...");
    browser = await puppeteer.launch({ 
      headless: "new", 
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      ],
      ignoreDefaultArgs: ['--enable-automation']
    });
    
    const page = await browser.newPage();
    
    // إخفاء هوية الأتمتة تماماً
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage && currentPage <= 5) {
      console.log(`📑 جاري اقتحام الصفحة رقم: ${currentPage}...`);
      const url = currentPage === 1 ? "https://couponscorpion.com/" : `https://couponscorpion.com/page/${currentPage}/`;
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });

      const isLoaded = await page.waitForSelector('article', { timeout: 20000 }).catch(() => false);
      if (!isLoaded) {
        console.log("⚠️ تم حظر الطلب. جاري حفظ 'blocked_view.png'...");
        await page.screenshot({ path: 'blocked_view.png' });
        break;
      }

      // 1. جمع قائمة روابط صفحات التفاصيل من الصفحة الحالية
      const initialCourses = await page.evaluate(() => {
        const articles = Array.from(document.querySelectorAll('article'));
        return articles.map(el => {
          const linkEl = el.querySelector('a');
          const imgEl = el.querySelector('img');
          const titleEl = el.querySelector('h3, h2, .post-title');
          
          return {
            title: titleEl?.innerText?.trim() || linkEl?.innerText?.trim(),
            detailLink: linkEl?.href,
            image: imgEl?.src || imgEl?.dataset?.src
          };
        }).filter(item => item.title && item.detailLink && item.detailLink.includes('couponscorpion.com'));
      });

      console.log(`🔍 وجدنا ${initialCourses.length} رابط. جاري استخراج الروابط المباشرة...`);

      // 2. الدخول لكل صفحة كورس واستخراج الرابط النهائي
      for (const course of initialCourses) {
        // التأكد أن الكورس غير موجود مسبقاً
        if (await Course.findOne({ title: course.title })) continue;

        try {
          const detailPage = await browser.newPage();
          // محاكاة نفس بصمة المتصفح
          await detailPage.setUserAgent(await page.evaluate(() => navigator.userAgent));
          
          await detailPage.goto(course.detailLink, { waitUntil: 'domcontentloaded', timeout: 60000 });
          
          // استخراج الرابط المباشر من الزرار النهائي (btn_offer_block)
          const directUdemyLink = await detailPage.evaluate(() => {
            const btn = document.querySelector('a.btn_offer_block.re_track_btn');
            return btn ? btn.href : null;
          });

          if (directUdemyLink) {
            const courseSlug = slugify(course.title, { lower: true, strict: true });
            await Course.create({
              title: course.title,
              slug: courseSlug,
              image: course.image || "https://via.placeholder.com/300x150?text=Premium+Course",
              udemyLink: directUdemyLink, // الرابط المباشر بالكود!
              category: "Scorpion Global"
            });
            console.log(`✅ تم اقتناص الرابط المباشر لـ: ${course.title}`);
          }

          await detailPage.close();
          // توقف بسيط لتجنب كشف السلوك الآلي
          await new Promise(r => setTimeout(r, 1500));
        } catch (err) {
          console.log(`⚠️ فشل الدخول لصفحة الكورس: ${course.title}`);
        }
      }

      currentPage++;
      await new Promise(r => setTimeout(r, Math.random() * 2000 + 2000));
    }
    console.log("🏁 المهمة اكتملت بنجاح بالروابط المباشرة!");
  } catch (error) {
    console.error("❌ خطأ قاتل في المحرك المطور:", error.message);
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = { scrapeTutorialBar };