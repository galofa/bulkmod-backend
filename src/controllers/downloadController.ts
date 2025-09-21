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

    static async handleUploadFromModList(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId;
            const mcVersion = req.body.mcVersion;
            const modLoader = req.body.modLoader;
            const modListId = req.body.modListId;

            console.log("Upload from modlist request:", { userId, mcVersion, modLoader, modListId });

            if (!userId) {
                res.status(401).json({ error: "Authentication required." });
                return;
            }

            if (!mcVersion || !modLoader || !modListId) {
                res.status(400).json({ error: "Missing version, loader, or mod list ID." });
                return;
            }

            // Get modlist from database
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            
            const modList = await prisma.modList.findUnique({
                where: { 
                    id: parseInt(modListId),
                    userId: userId // Ensure user owns the modlist
                },
                include: { mods: true }
            });

            if (!modList) {
                res.status(404).json({ error: "Mod list not found." });
                return;
            }

            // Convert mods to URLs
            const modUrls = modList.mods.map(mod => {
                const isPlugin = mod.modSlug.includes('plugin') || mod.modSlug.includes('worldedit') || mod.modSlug.includes('chunky');
                return `https://modrinth.com/${isPlugin ? 'plugin' : 'mod'}/${mod.modSlug}`;
            });

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
                    await FileService.cleanupJobFolder(jobFolder);
                } catch (err) {
                    console.error("Error processing mods from modlist:", err);
                    JobService.notifyClients(jobId, { error: "Failed to process mods." }, "error");
                    JobService.endClients(jobId);
                }
            })();

            res.json({ jobId, totalMods });
        } catch (err) {
            console.error("Error in upload-mods-from-list:", err);
            res.status(500).json({ error: "Internal server error." });
        }
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