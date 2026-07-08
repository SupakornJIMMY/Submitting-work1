import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON and urlencoded body with high limits for file upload (base64 documents/images)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // GET Sync proxy route
  app.get("/api/sync", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, error: "Missing apps script URL" });
    }

    try {
      // Append a cache buster timestamp
      const targetUrl = url.includes("?") ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
      const response = await fetch(targetUrl, {
        method: "GET",
      });
      
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        res.json(data);
      } catch (parseErr) {
        // 1. Check for .setHeader error
        if (text.includes("setHeader is not a function") || text.includes("setHeader")) {
          return res.status(400).json({
            success: false,
            error: "เกิดข้อผิดพลาดในโค้ด Google Apps Script: ไม่พบฟังก์ชัน '.setHeader()' บนออบเจกต์ผลลัพธ์ (กรุณาเข้าไปที่ส่วนขยาย Google Apps Script ของคุณ แล้วลบคำสั่ง .setHeader(\"Access-Control-Allow-Origin\", \"*\") ออกจากบรรทัด doGet และ doPost แล้วบันทึกและทำการ \"Deploy\" เป็นเวอร์ชันใหม่ เนื่องจากระบบใช้ระบบ Proxy Server ตัวแทนของเราในการเชื่อมต่อ คำสั่งนี้จึงไม่จำเป็นและเป็นสาเหตุให้ระบบพัง)"
          });
        }

        // 2. Extract general Google Apps Script execution error text if any
        const errorMatch = text.match(/<div style="text-align:center;font-family:monospace[^>]*>([\s\S]*?)<\/div>/);
        if (errorMatch && errorMatch[1]) {
          const cleanedError = errorMatch[1]
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
          return res.status(400).json({
            success: false,
            error: `ข้อผิดพลาดในการประมวลผลของ Google Apps Script: "${cleanedError}"`
          });
        }

        // 3. Check for unauthorized / sign-in screen
        if (text.includes("google-signin") || text.includes("Service login") || text.includes("Sign in - Google Accounts") || text.includes("login")) {
          return res.status(400).json({
            success: false,
            error: "การเข้าถึงถูกปฏิเสธ: กรุณาตรวจสอบว่าคุณได้ตั้งค่า 'Who has access' (ผู้มีสิทธิ์เข้าถึง) ใน Google Apps Script ให้เป็น 'Anyone' (ทุกคน) หรือยัง หากเลือกเป็น 'Only myself' หรือ 'Anyone with Google account' จะไม่สามารถใช้งานร่วมกับเว็บแอปภายนอกได้"
          });
        }

        return res.status(400).json({
          success: false,
          error: "ข้อมูลที่ได้รับจาก Google Apps Script ไม่ใช่รูปแบบ JSON (อาจเกิดจากข้อผิดพลาดในโค้ดของสคริปต์): " + (text.length > 150 ? text.substring(0, 150) + "..." : text)
        });
      }
    } catch (err: any) {
      console.error("Proxy GET Error:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to fetch from Apps Script" });
    }
  });

  // POST action/call proxy route
  app.post("/api/call", async (req, res) => {
    const { url, ...payload } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, error: "Missing apps script URL" });
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        res.json(data);
      } catch (parseErr) {
        // 1. Check for .setHeader error
        if (text.includes("setHeader is not a function") || text.includes("setHeader")) {
          return res.status(400).json({
            success: false,
            error: "เกิดข้อผิดพลาดในโค้ด Google Apps Script: ไม่พบฟังก์ชัน '.setHeader()' บนออบเจกต์ผลลัพธ์ (กรุณาเข้าไปที่ส่วนขยาย Google Apps Script ของคุณ แล้วลบคำสั่ง .setHeader(\"Access-Control-Allow-Origin\", \"*\") ออกจากบรรทัด doGet และ doPost แล้วบันทึกและทำการ \"Deploy\" เป็นเวอร์ชันใหม่ เนื่องจากระบบใช้ระบบ Proxy Server ตัวแทนของเราในการเชื่อมต่อ คำสั่งนี้จึงไม่จำเป็นและเป็นสาเหตุให้ระบบพัง)"
          });
        }

        // 2. Extract general Google Apps Script execution error text if any
        const errorMatch = text.match(/<div style="text-align:center;font-family:monospace[^>]*>([\s\S]*?)<\/div>/);
        if (errorMatch && errorMatch[1]) {
          const cleanedError = errorMatch[1]
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
          return res.status(400).json({
            success: false,
            error: `ข้อผิดพลาดในการประมวลผลของ Google Apps Script: "${cleanedError}"`
          });
        }

        // 3. Check for unauthorized / sign-in screen
        if (text.includes("google-signin") || text.includes("Service login") || text.includes("Sign in - Google Accounts") || text.includes("login")) {
          return res.status(400).json({
            success: false,
            error: "การเข้าถึงถูกปฏิเสธ: กรุณาตรวจสอบว่าคุณได้ตั้งค่า 'Who has access' (ผู้มีสิทธิ์เข้าถึง) ใน Google Apps Script ให้เป็น 'Anyone' (ทุกคน) หรือยัง หากเลือกเป็น 'Only myself' หรือ 'Anyone with Google account' จะไม่สามารถใช้งานร่วมกับเว็บแอปภายนอกได้"
          });
        }

        return res.status(400).json({
          success: false,
          error: "ข้อมูลที่ได้รับจาก Google Apps Script ไม่ใช่รูปแบบ JSON (อาจเกิดจากข้อผิดพลาดในโค้ดของสคริปต์): " + (text.length > 150 ? text.substring(0, 150) + "..." : text)
        });
      }
    } catch (err: any) {
      console.error("Proxy POST Error:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to call Apps Script" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
