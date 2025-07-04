import express, { Request, Response } from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import detectSource from "../utils/detectSource";
import * as modrinth from "../utils/modrinth";

const router = express.Router();

// Multer setup: upload .txt to uploads/
const upload = multer({
    dest: path.join(__dirname, "../../uploads"),
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === "text/plain") cb(null, true);
        else cb(new Error("Only .txt files are allowed"));
    }
});

interface DownloadResult {
    url: string;
    success: boolean;
    message: string;
    fileName?: string;
}

router.post("/", upload.single("modsFile"), async (req: Request, res: Response) => {
    try {
        const mcVersion = req.body.mcVersion as string;
        const modLoader = req.body.modLoader as string;
        const downloadPath = req.body.downloadPath || "downloads"; // fallback

        if (!mcVersion || !modLoader) {
            return res.status(400).json({ error: "Missing mcVersion or modLoader" });
        }

        if (!req.file) {
            return res.status(400).json({ error: "No modsFile uploaded" });
        }

        const filePath = req.file.path;
        const text = await fs.readFile(filePath, "utf-8");

        const modUrls = text.split(/\r?\n/).filter(Boolean);
        const results: DownloadResult[] = [];

        for (const url of modUrls) {
            const source = detectSource(url);
            let result: DownloadResult = {
                url,
                success: false,
                message: "Unknown source or unsupported"
            };

            try {
                switch (source) {
                    case "modrinth":
                        result = await modrinth.downloadMod(url, mcVersion, modLoader, downloadPath);
                        break;
                    case "custom":
                        result = {
                            url,
                            success: false,
                            message: "Custom source handling not implemented"
                        };
                        break;
                    default:
                        result = {
                            url,
                            success: false,
                            message: "Unsupported source"
                        };
                        break;
                }
            } catch (error: any) {
                result = {
                    url,
                    success: false,
                    message: error.message || "Error processing mod"
                };
            }

            results.push(result);
        }

        // Clean up uploaded .txt
        await fs.unlink(filePath);

        res.json({ results });
    } catch (err: any) {
        res.status(500).json({ error: err.message || "Internal server error" });
    }
});

export default router;
