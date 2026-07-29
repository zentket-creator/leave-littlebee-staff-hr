// Vercel Serverless Function — ใช้แทน window.storage ของ Claude artifact
// อ่าน/เขียนค่าแบบ key-value ผ่าน Upstash Redis เพื่อให้ทุกคนที่เปิดเว็บนี้ (พนักงาน + HR) เห็นข้อมูลชุดเดียวกันแบบเรียลไทม์

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const key = req.query.key;
  if (!key) {
    return res.status(400).json({ error: 'missing key parameter' });
  }

  if (key === '__healthcheck__') {
    try {
      await redis.set('__healthcheck__', '1');
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e) });
    }
  }

  try {
    if (req.method === 'GET') {
      const value = await redis.get(key);
      return res.status(200).json({ key, value: value ?? null });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const value = body?.value ?? null;
      await redis.set(key, value);
      return res.status(200).json({ key, ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
