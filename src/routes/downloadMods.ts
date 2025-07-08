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

const jobs = new Map<string, DownloadResult[]>();
const clientsByJobId = new Map<string, Response[]>();

const baseDownloadsPath = path.resolve(__dirname, "../../downloads");
const uploadPath = path.resolve(__dirname, "../../uploads");

const upload = multer({
    dest: uploadPath,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === "text/plain") cb(null, true);
        else cb(new Error("Only .txt files are allowed"));
    }
});

router.get("/progress/:jobId", (req: Request, res: Response) => {
    const jobId = req.params.jobId;

    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
    });
    res.flushHeaders();

    if (!clientsByJobId.has(jobId)) {
        clientsByJobId.set(jobId, []);
    }

    clientsByJobId.get(jobId)!.push(res);

    // Optional: tell backend connection is ready
    res.write("event: ready\ndata: connected\n\n");

    req.on("close", () => {
        const remaining = (clientsByJobId.get(jobId) || []).filter(r => r !== res);
        clientsByJobId.set(jobId, remaining);
    });
});

router.post("/upload-mods", upload.single("modsFile"), async (req: Request, res: Response) => {
    try {
        const mcVersion = req.body.mcVersion;
        const modLoader = req.body.modLoader;
        const filePath = req.file?.path;

        if (!mcVersion || !modLoader || !filePath) {
            return res.status(400).json({ error: "Missing version, loader, or file." });
        }

        const text = await fs.readFile(filePath, "utf-8");
        const modUrls = text.split(/\r?\n/).filter(Boolean);
        const jobId = Date.now().toString();
        const totalMods = modUrls.length;

        jobs.set(jobId, []);

        (async () => {
            const jobFolder = path.resolve(baseDownloadsPath, `job_${jobId}`);
            await fs.mkdir(jobFolder, { recursive: true });

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

            await waitForClient();

            for (const url of modUrls) {
                let result: DownloadResult = {
                    url,
                    success: false,
                    message: "Unknown or unsupported source"
                };

                try {
                    const source = detectSource(url);
                    if (source === "modrinth") {
                        result = await modrinth.downloadMod(url, mcVersion, modLoader, jobFolder);
                    } else if (source === "custom") {
                        result.message = "Custom source not implemented";
                    } else {
                        result.message = "Unsupported source";
                    }
                } catch (err: any) {
                    console.log(err);
                    result = {
                        url,
                        success: false,
                        message: err.message || "Unexpected error"
                    };
                }

                console.log(result);
                jobs.get(jobId)!.push(result);

                const clients = clientsByJobId.get(jobId) || [];
                for (const res of clients) {
                    res.write(`data: ${JSON.stringify(result)}\n\n`);
                }

                await new Promise((r) => setTimeout(r, 300));
            }

            // Zip all .jar files
            const zipName = `mods_${jobId}.zip`;
            const zipPath = path.join(baseDownloadsPath, zipName);
            const output = fsSync.createWriteStream(zipPath);
            const archive = archiver("zip", { zlib: { level: 9 } });

            archive.pipe(output);
            archive.directory(jobFolder, false);
            await archive.finalize();

            await fs.rm(jobFolder, { recursive: true, force: true });

            const clients = clientsByJobId.get(jobId) || [];
            const zipUrl = `${process.env.BASE_URL || "http://localhost:4000"}/downloads/${zipName}`;

            for (const res of clients) {
                res.write(`event: done\ndata: ${JSON.stringify({ zipUrl })}\n\n`);
                res.end();
            }

            clientsByJobId.delete(jobId);

            try {
                const files = await fs.readdir(baseDownloadsPath);
                for (const file of files) {
                    if (!file.endsWith(".zip")) continue;
                    const filePath = path.join(baseDownloadsPath, file);
                    const stats = await fs.stat(filePath);
                    const ageHours = (Date.now() - stats.mtimeMs) / 1000 / 60 / 60;
                    if (ageHours > 1) await fs.unlink(filePath);
                }
            } catch (e) {
                console.error("Error cleaning old downloads:", e);
            }
        })();

        await fs.unlink(filePath);
        res.json({ jobId, totalMods });

    } catch (err: any) {
        console.error("Error in upload-mods:", err);
        res.status(500).json({ error: err.message || "Internal error" });
    }
});

router.get("/results/:jobId", (req: Request, res: Response) => {
    const jobId = req.params.jobId;
    const results = jobs.get(jobId) || [];
    res.json({ results });
});

export default router;
