import archiver from "archiver";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { DownloadResult } from "../types";

export class FileService {
    private static baseDownloadsPath = path.resolve(__dirname, "../../downloads");
    private static uploadPath = path.resolve(__dirname, "../../uploads");

    static async createJobFolder(jobId: string): Promise<string> {
        const jobFolder = path.resolve(this.baseDownloadsPath, `job_${jobId}`);
        await fs.mkdir(jobFolder, { recursive: true });
        return jobFolder;
    }

    static async createZipFromFolder(jobFolder: string): Promise<string> {
        const zipName = `mods.zip`;
        const zipPath = path.join(this.baseDownloadsPath, zipName);
        const output = fsSync.createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        archive.pipe(output);
        archive.directory(jobFolder, false);
        await archive.finalize();

        return zipName;
    }

    static async cleanupJobFolder(jobFolder: string): Promise<void> {
        await fs.rm(jobFolder, { recursive: true, force: true });
    }

    static async cleanupOldFiles(): Promise<void> {
        // Clean zip files in /downloads older than 2 minutes
        try {
            const files = await fs.readdir(this.baseDownloadsPath);
            for (const file of files) {
                if (!file.endsWith(".zip")) continue;
                const filePath = path.join(this.baseDownloadsPath, file);
                const stats = await fs.stat(filePath);
                const ageMinutes = (Date.now() - stats.mtimeMs) / 1000 / 60;
                if (ageMinutes > 2) await fs.unlink(filePath);
            }
        } catch (e) {
            console.error("Error cleaning old downloads:", e);
        }

        // Clean files in /uploads older than 2 minutes
        try {
            const uploadFiles = await fs.readdir(this.uploadPath);
            for (const file of uploadFiles) {
                const filePath = path.join(this.uploadPath, file);
                const stats = await fs.stat(filePath);
                const ageMinutes = (Date.now() - stats.mtimeMs) / 1000 / 60;
                if (ageMinutes > 2) await fs.unlink(filePath);
            }
        } catch (e) {
            console.error("Error cleaning old uploads:", e);
        }
    }

    static async readModUrls(filePath: string): Promise<string[]> {
        const text = await fs.readFile(filePath, "utf-8");
        return text.split(/\r?\n/).filter(Boolean);
    }

    static async deleteUploadedFile(filePath: string): Promise<void> {
        await fs.unlink(filePath);
    }

    static getZipUrl(zipName: string): string {
        return `${process.env.BASE_URL || "http://localhost:4000"}/downloads/${zipName}`;
    }
} 