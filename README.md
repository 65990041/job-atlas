# Job Atlas

เว็บส่วนตัวสำหรับค้นหา เปรียบเทียบ และดูตำแหน่งที่ทำงานจากประกาศงาน KOSEN ชุดวันที่ 19 พฤศจิกายน 2026

## ใช้งานในเครื่อง

1. ติดตั้ง Node.js 24 และ Python 3 พร้อม PyMuPDF (`pip install pymupdf`)
2. รัน `npm install`
3. รัน `npm run dev`
4. เปิด URL ที่ Vite แสดง

เว็บอ่านข้อมูลจาก `src/data/jobs.json` และ `src/data/locations.json` โดยไม่ต้องใช้เซิร์ฟเวอร์ฐานข้อมูล สถานะสมัครและโน้ตเก็บในเบราว์เซอร์ของเครื่องนั้นเท่านั้น ไม่ซิงก์ข้ามเครื่อง

## อัปเดตประกาศ

รัน `python scripts/extract_jobs.py "<path-to-zip>"` เพื่อสร้าง `src/data/jobs.json` ใหม่ แล้วตรวจรหัสประกาศ เงินเดือน สาขา และข้อความที่ตีความยากกับ PDF ต้นทาง ปรับ `src/data/locations.json` แยกต่างหากเมื่อมีสถานที่ใหม่หรือประกาศแก้ไข ไม่คัดลอก PDF เข้าเว็บหรือโฟลเดอร์ `dist`

หมุดที่มี `precision` เป็น `district` หรือ `province` คือพื้นที่โดยประมาณ หมุด `estate` คือนิคมโดยประมาณ ส่วน `building` มีจุดอาคารจากแหล่งแผนที่ การปักหมุดหลายไซต์ไม่ยืนยันว่าแต่ละตำแหน่งจะได้ทำงานทุกไซต์ ควรสอบถามบริษัทอีกครั้ง

## ตรวจสอบ

- `python -m unittest discover -s tests -v`
- `npm test`
- `npm run build`

ข้อมูลแผนที่ใช้ [OpenStreetMap](https://www.openstreetmap.org/copyright) และต้องทำตาม [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) หากเปลี่ยนผู้ให้บริการแผนที่ ให้ตั้ง `VITE_MAP_TILE_URL` และตรวจเงื่อนไขการแสดงเครดิตตามผู้ให้บริการนั้น
