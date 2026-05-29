import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 7 * 1024 * 1024 }, // 7MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "text/plain",
      "text/x-lua",
      "application/json",
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/html",
      "text/css",
      "application/javascript",
    ];
    if (
      allowedTypes.some((t) => file.mimetype.startsWith(t.split("/")[0])) ||
      allowedTypes.includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(null, true); // Accept all files up to 7MB
    }
  },
});

router.post("/files/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileUrl = `/api/files/${req.file.filename}`;

    res.json({
      url: fileUrl,
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to upload file");
    res.status(500).json({ error: "Failed to upload file" });
  }
});

router.get("/files/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    const safeName = path.basename(filename);
    const filePath = path.join(uploadsDir, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filePath);
  } catch (err) {
    req.log.error({ err }, "Failed to serve file");
    res.status(500).json({ error: "Failed to serve file" });
  }
});

export default router;
