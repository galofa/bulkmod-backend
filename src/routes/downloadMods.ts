import express from "express";
import multer from "multer";
import path from "path";
import { DownloadController } from "../controllers/downloadController";

const router = express.Router();

// Base upload path
const uploadPath = path.resolve(__dirname, "../../uploads");

// Multer configuration for file uploads
const upload = multer({
    dest: uploadPath,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === "text/plain") cb(null, true);
        else cb(new Error("Only .txt files are allowed"));
    }
});

// Get progress for a job
router.get("/progress/:jobId", DownloadController.handleProgress);

// Upload mods
router.post("/upload-mods", upload.single("modsFile"), DownloadController.handleUpload);

// Get results for a job
router.get("/results/:jobId", DownloadController.handleResults);

export default router;
