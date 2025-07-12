import detectSource from "../utils/detectSource";
import * as modrinth from "../utils/modrinth";
import { DownloadResult } from "../types";

export class ModProcessingService {
    static async processMod(
        url: string, 
        mcVersion: string, 
        modLoader: string, 
        jobFolder: string
    ): Promise<DownloadResult> {
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
                result.message = "Invalid source";
            } else {
                result.message = "Unsupported source";
            }
        } catch (err: any) {
            result = {
                url,
                success: false,
                message: err.message || "Unexpected error"
            };
        }

        return result;
    }

    static async processMods(
        modUrls: string[], 
        mcVersion: string, 
        modLoader: string, 
        jobFolder: string,
        onProgress: (result: DownloadResult) => void
    ): Promise<void> {
        for (const url of modUrls) {
            const result = await this.processMod(url, mcVersion, modLoader, jobFolder);
            onProgress(result);
            
            // Wait for 300ms between downloads
            await new Promise((r) => setTimeout(r, 300));
        }
    }
} 