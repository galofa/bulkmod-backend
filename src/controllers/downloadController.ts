import { Request, Response } from "express";
import { JobService } from "../services/jobService";
import { FileService } from "../services/fileService";
import { ModProcessingService } from "../services/modProcessingService";

export class DownloadController {
    static async handleUpload(req: Request, res: Response): Promise<void> {
        try {
            const mcVersion = req.body.mcVersion;
            const modLoader = req.body.modLoader;
            const filePath = req.file?.path;

            if (!mcVersion || !modLoader || !filePath) {
                res.status(400).json({ error: "Missing version, loader, or file." });
                return;
            }

            // Read mod URLs from file
            const modUrls = await FileService.readModUrls(filePath);
            const jobId = Date.now().toString();
            const totalMods = modUrls.length;

            // Initialize job
            JobService.createJob(jobId);

            // Process mods asynchronously
            (async () => {
                try {
                    // Create job folder
                    const jobFolder = await FileService.createJobFolder(jobId);

                    // Wait for client to connect
                    await JobService.waitForClient(jobId);

                    // Process mods
                    await ModProcessingService.processMods(
                        modUrls,
                        mcVersion,
                        modLoader,
                        jobFolder,
                        (result) => {
                            JobService.addResult(jobId, result);
                            JobService.notifyClients(jobId, result);
                        }
                    );

                    // Handle completion
                    await DownloadController.handleJobCompletion(jobId, jobFolder);

                    // Cleanup
                    await FileService.cleanupOldFiles();
                    JobService.deleteJob(jobId);

                } catch (error) {
                    console.error("Error processing mods:", error);
                    JobService.notifyClients(jobId, { error: "Processing failed" }, "error");
                    JobService.endClients(jobId);
                    JobService.deleteJob(jobId);
                }
            })();

            // Clean uploaded file
            await FileService.deleteUploadedFile(filePath);
            res.json({ jobId, totalMods });

        } catch (err: any) {
            console.error("Error in upload-mods:", err);
            res.status(500).json({ error: err.message || "Internal error" });
        }
    }

    static async handleProgress(req: Request, res: Response): Promise<void> {
        const jobId = req.params.jobId;

        // Set headers for SSE
        res.set({
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        });
        res.flushHeaders();

        // Add client to job
        JobService.addClient(jobId, res);

        // Send initial message
        res.write("event: ready\ndata: connected\n\n");

        // Remove client on close
        req.on("close", () => {
            JobService.removeClient(jobId, res);
        });
    }

    static async handleResults(req: Request, res: Response): Promise<void> {
        const jobId = req.params.jobId;
        const results = JobService.getResults(jobId);
        res.json({ results });
    }

    private static async handleJobCompletion(jobId: string, jobFolder: string): Promise<void> {
        const hasAnySuccess = JobService.hasAnySuccess(jobId);

        if (hasAnySuccess) {
            // Create ZIP file
            const zipName = await FileService.createZipFromFolder(jobFolder);
            const zipUrl = FileService.getZipUrl(zipName);

            // Notify clients and end
            JobService.notifyClients(jobId, { zipUrl }, "done");
            JobService.endClients(jobId);
        } else {
            // No mods downloaded successfully
            JobService.notifyClients(jobId, { message: "No mods were downloaded successfully." }, "done");
            JobService.endClients(jobId);
        }

        // Cleanup job folder
        await FileService.cleanupJobFolder(jobFolder);
    }
} 