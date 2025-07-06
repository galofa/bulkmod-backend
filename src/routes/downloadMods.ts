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

// Corrijo baseDownloadsPath para que no termine con slash
const baseDownloadsPath = path.resolve(__dirname, "../../downloads").replace(/[\\/]+$/, "");

const upload = multer({
    dest: path.join(__dirname, "../../uploads"),
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

        // Start async download + zip process
        (async () => {
            // Armo ruta del folder de trabajo usando path.resolve para evitar problemas
            const jobFolder = path.resolve(baseDownloadsPath, `job_${jobId}`);

            console.log("baseDownloadsPath:", baseDownloadsPath);
            console.log("jobFolder:", jobFolder);

            await fs.mkdir(jobFolder, { recursive: true });

            for (const url of modUrls) {
                let result: DownloadResult = {
                    url,
                    success: false,
                    message: "Unknown or unsupported source"
                };

                try {
                    const source = detectSource(url);
                    switch (source) {
                        case "modrinth":
                            result = await modrinth.downloadMod(url, mcVersion, modLoader, jobFolder);
                            break;
                        case "custom":
                            result.message = "Custom source not implemented";
                            break;
                        default:
                            result.message = "Unsupported source";
                            break;
                    }
                } catch (err: any) {
                    result = {
                        url,
                        success: false,
                        message: err.message || "Unexpected error"
                    };
                }

                jobs.get(jobId)!.push(result);

                const clients = clientsByJobId.get(jobId) || [];
                for (const res of clients) {
                    res.write(`data: ${JSON.stringify(result)}\n\n`);
                }

                await new Promise((r) => setTimeout(r, 300));
            }

            // ZIP all downloaded .jar files
            const zipName = `mods.zip`;
            const zipPath = path.join(baseDownloadsPath, zipName);
            const output = fsSync.createWriteStream(zipPath);
            const archive = archiver("zip", { zlib: { level: 9 } });

            archive.pipe(output);
            archive.directory(jobFolder, false);
            await archive.finalize();

            // Clean up mod files after zipping
            await fs.rm(jobFolder, { recursive: true, force: true });

            // Notify all clients
            const clients = clientsByJobId.get(jobId) || [];
            for (const res of clients) {
                res.write(`event: done\ndata: ${JSON.stringify({ zipUrl: `http://localhost:4000/downloads/${zipName}` })}\n\n`);
                res.end();
            }

            clientsByJobId.delete(jobId);

            try {
                await fs.rm(baseDownloadsPath, { recursive: true, force: true });
                await fs.mkdir(baseDownloadsPath, { recursive: true }); // vuelve a crearla vacía
                console.log("✅ Carpeta 'downloads' limpiada al finalizar");
            } catch (e) {
                console.error("❌ Error al limpiar carpeta 'downloads':", e);
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
