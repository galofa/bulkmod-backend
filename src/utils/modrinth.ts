import axios from "axios";
import path from "path";
import fs from "fs/promises";
import { createWriteStream } from "fs";

const API_BASE = "https://api.modrinth.com/v2";

// Modrinth URL regex
const types = ['mod', 'plugin', 'resourcepack', 'shader', 'datapack', 'modpack'];
const typePattern = types.join('|');
const regex = new RegExp(`modrinth\\.com\\/(${typePattern})\\/([^/]+)`, "i");

// Extract slug from Modrinth URL
function extractSlug(url: string): string | null {
    const match = url.match(regex);
    return match ? match[2] : null;
}

// Download Modrinth mod
export async function downloadMod(
        modUrl: string, 
        mcVersion: string, 
        modLoader: string, 
        downloadPath: string = "downloads"
    ): Promise<{
        url: string; 
        success: boolean; 
        message: string; 
        fileName?: string;
    }> {

    const slug = extractSlug(modUrl);

    // Check if the URL is valid
    if (!slug) {
        return { url: modUrl, success: false, message: "Invalid Modrinth URL" };
    }

    try {
        // Get project data
        const { data: project } = await axios.get(`${API_BASE}/project/${slug}`);

        // Get versions data
        const { data: versions } = await axios.get(`${API_BASE}/project/${project.id}/version`);

        // Find compatible version
        const compatible = versions.find((version: any) =>
            version.game_versions.includes(mcVersion) &&
            version.loaders.includes(modLoader.toLowerCase())
        );

        // Check if compatible version is found
        if (!compatible) {
            return {
                url: modUrl,
                success: false,
                message: `No match for ${mcVersion} (${modLoader})`
            };
        }

        // Get the first file from the compatible version
        const file = compatible.files?.[0];
        if (!file) {
            return {
                url: modUrl,
                success: false,
                message: "No file found for compatible version"
            };
        }

        // Get the download URL and file name
        const downloadUrl = file.url;
        const fileName = file.filename;
        const filePath = path.join(downloadPath, fileName);

        // Create download directory
        await fs.mkdir(downloadPath, { recursive: true });

        // Download the file
        const response = await axios.get(downloadUrl, { responseType: "stream" });
        const writer = createWriteStream(filePath);

        // Pipe the response to the file
        response.data.pipe(writer);

        // Wait for the file to be written
        await new Promise<void>((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        // Return the result
        return {
            url: modUrl,
            success: true,
            message: `Downloaded ${fileName}`,
            fileName
        };
    } catch (error: any) {
        // Return the error
        return {
            url: modUrl,
            success: false,
            message: `Error: ${error.message || "Unknown error"}`
        };
    }
}
