import express, { Request, Response } from "express";
import multer from "multer";
import archiver from "archiver";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import detectSource from "../utils/detectSource";
import * as modrinth from "../utils/modrinth";

const router = express.Router();

interface DownloadResult {
    url: string;
    success: boolean;
    message: string;
    fileName?: string;
    downloadUrl?: string;
}

// Map to store job results
const jobs = new Map<string, DownloadResult[]>();
const clientsByJobId = new Map<string, Response[]>();

// Base download path
const baseDownloadsPath = path.resolve(__dirname, "../../downloads");
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
router.get("/progress/:jobId", (req: Request, res: Response) => {
    const jobId = req.params.jobId;

    // Set headers for SSE
    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
    });
    res.flushHeaders();

    // Add client to job
    if (!clientsByJobId.has(jobId)) {
        clientsByJobId.set(jobId, []);
    }

    clientsByJobId.get(jobId)!.push(res);

    // Send initial message
    res.write("event: ready\ndata: connected\n\n");

    // Remove client on close
    req.on("close", () => {
        const remaining = (clientsByJobId.get(jobId) || []).filter(r => r !== res);
        clientsByJobId.set(jobId, remaining);
    });
});

// Upload mods
router.post("/upload-mods", upload.single("modsFile"), async (req: Request, res: Response) => {
    try {
        const mcVersion = req.body.mcVersion;
        const modLoader = req.body.modLoader;
        const filePath = req.file?.path;

        if (!mcVersion || !modLoader || !filePath) {
            return res.status(400).json({ error: "Missing version, loader, or file." });
        }

        // Read file and split into mod URLs
        const text = await fs.readFile(filePath, "utf-8");
        const modUrls = text.split(/\r?\n/).filter(Boolean);
        const jobId = Date.now().toString();
        const totalMods = modUrls.length;

        // Initialize job results
        jobs.set(jobId, []);

        // Process mods
        (async () => {
            const jobFolder = path.resolve(baseDownloadsPath, `job_${jobId}`);
            await fs.mkdir(jobFolder, { recursive: true });

            // Wait for client to connect
            const waitForClient = async () => {
                const maxWaitMs = 5000;
                const intervalMs = 100;
                let waited = 0;
                while (!clientsByJobId.has(jobId) || clientsByJobId.get(jobId)!.length === 0) {
                    await new Promise(r => setTimeout(r, intervalMs));
                    waited += intervalMs;
                    if (waited >= maxWaitMs) break;
                }
            };

            // Wait for client to connect
            await waitForClient();

            // Process each mod
            for (const url of modUrls) {
                // Initialize result
                let result: DownloadResult = {
                    url,
                    success: false,
                    message: "Unknown or unsupported source"
                };

                try {
                    // Detect source
                    const source = detectSource(url);
                    if (source === "modrinth") {
                        result = await modrinth.downloadMod(url, mcVersion, modLoader, jobFolder);
                    } else if (source === "invalid") {
                        // Invalid source
                        result.message = "Invalid source";
                    } else {
                        // Unsupported source (might add in the future)
                        result.message = "Unsupported source";
                    }
                } catch (err: any) {
                    // Unexpected error
                    result = {
                        url,
                        success: false,
                        message: err.message || "Unexpected error"
                    };
                }

                // Add result to job
                jobs.get(jobId)!.push(result);

                // Notify clients
                const clients = clientsByJobId.get(jobId) || [];
                for (const res of clients) {
                    res.write(`data: ${JSON.stringify(result)}\n\n`);
                }

                // Wait for 300ms
                await new Promise((r) => setTimeout(r, 300));
            }

            // Zip all .jar files
            const zipName = `mods.zip`;
            const zipPath = path.join(baseDownloadsPath, zipName);
            const output = fsSync.createWriteStream(zipPath);
            const archive = archiver("zip", { zlib: { level: 9 } });

            archive.pipe(output);
            archive.directory(jobFolder, false);
            await archive.finalize();

            // Cleanup downloaded mods
            await fs.rm(jobFolder, { recursive: true, force: true });

            // Notify clients
            const clients = clientsByJobId.get(jobId) || [];
            const zipUrl = `${process.env.BASE_URL || "http://localhost:4000"}/downloads/${zipName}`;

            for (const res of clients) {
                res.write(`event: done\ndata: ${JSON.stringify({ zipUrl })}\n\n`);
                res.end();
            }

            clientsByJobId.delete(jobId);

            // Clean zip files in /downloads older than 2 minutes
            try {
                const files = await fs.readdir(baseDownloadsPath);
                for (const file of files) {
                    if (!file.endsWith(".zip")) continue;
                    const filePath = path.join(baseDownloadsPath, file);
                    const stats = await fs.stat(filePath);
                    const ageMinutes = (Date.now() - stats.mtimeMs) / 1000 / 60;
                    if (ageMinutes > 2) await fs.unlink(filePath);
                }
            } catch (e) {
                console.error("Error cleaning old downloads:", e);
            }

            // Clean files in /uploads older than 2 minutes
            try {
                const uploadFiles = await fs.readdir(uploadPath);
                for (const file of uploadFiles) {
                    const filePath = path.join(uploadPath, file);
                    const stats = await fs.stat(filePath);
                    const ageMinutes = (Date.now() - stats.mtimeMs) / 1000 / 60;
                    if (ageMinutes > 2) await fs.unlink(filePath);
                }
            } catch (e) {
                console.error("Error cleaning old uploads:", e);
            }
        })();

        // Clean uploaded file
        await fs.unlink(filePath);
        res.json({ jobId, totalMods });

    } catch (err: any) {
        console.error("Error in upload-mods:", err);
        res.status(500).json({ error: err.message || "Internal error" });
    }
});

// Get results for a job
router.get("/results/:jobId", (req: Request, res: Response) => {
    const jobId = req.params.jobId;
    const results = jobs.get(jobId) || [];
    res.json({ results });
});

export default router;
