// Vercel Serverless Function — ใช้แทน window.storage ของ Claude artifact
// อ่าน/เขียนค่าแบบ key-value ผ่าน Vercel KV เพื่อให้ทุกคนที่เปิดเว็บนี้ (พนักงาน + HR) เห็นข้อมูลชุดเดียวกันแบบเรียลไทม์
//
// วิธีติดตั้ง (ทำครั้งเดียว):
// 1. ไปที่ Vercel Dashboard -> โปรเจกต์นี้ -> แท็บ "Storage" -> "Create Database" -> เลือก "KV" (หรือ "Upstash for Redis" ถ้า KV ไม่มีให้เลือกแล้ว)
// 2. ตั้งชื่อฐานข้อมูล แล้วกด Connect เข้ากับโปรเจกต์นี้ (Vercel จะเติม Environment Variables ให้อัตโนมัติ เช่น KV_REST_API_URL, KV_REST_API_TOKEN)
// 3. เพิ่ม dependency "@vercel/kv" ใน package.json ของโปรเจกต์ (ดูไฟล์ package.json ตัวอย่างที่แนบมาด้วย)
// 4. commit + push ไฟล์นี้ (และ package.json) เข้า GitHub repo ที่เชื่อมกับ Vercel -> ระบบจะ auto-deploy ให้เอง
// 5. ทดสอบโดยเปิดเว็บแล้วลองกดส่งคำขอลาจากอุปกรณ์หนึ่ง แล้วเช็คที่แดชบอร์ด HR จากอีกอุปกรณ์ว่าเห็นคำขอไหม

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const key = req.query.key;
  if (!key) {
    return res.status(400).json({ error: 'missing key parameter' });
  }

  // ใช้เช็คว่าเชื่อมต่อฐานข้อมูลได้ไหม (เรียกจากหน้าเว็บตอนโหลดหน้าแรก)
  if (key === '__healthcheck__') {
    try {
      await kv.set('__healthcheck__', '1');
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e) });
    }
  }

  try {
    if (req.method === 'GET') {
      const value = await kv.get(key);
      return res.status(200).json({ key, value: value ?? null });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const value = body?.value ?? null;
      await kv.set(key, value);
      return res.status(200).json({ key, ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
