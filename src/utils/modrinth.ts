import axios from "axios";
import path from "path";
import fs from "fs/promises";
import { createWriteStream } from "fs";

const API_BASE = "https://api.modrinth.com/v2";

function extractSlug(url: string): string | null {
    const match = url.match(/modrinth\.com\/mod\/([^/]+)/);
    return match ? match[1] : null;
}

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

    if (!slug) {
        return { url: modUrl, success: false, message: "Invalid Modrinth URL" };
    }

    try {
        const { data: project } = await axios.get(`${API_BASE}/project/${slug}`);
        const { data: versions } = await axios.get(`${API_BASE}/project/${project.id}/version`);

        const compatible = versions.find((version: any) =>
            version.game_versions.includes(mcVersion) &&
            version.loaders.includes(modLoader.toLowerCase())
        );

        if (!compatible) {
            return {
                url: modUrl,
                success: false,
                message: `No match for ${mcVersion} (${modLoader})`
            };
        }

        const file = compatible.files?.[0];
        if (!file) {
            return {
                url: modUrl,
                success: false,
                message: "No file found for compatible version"
            };
        }

        const downloadUrl = file.url;
        const fileName = file.filename;
        const filePath = path.join(downloadPath, fileName);

        await fs.mkdir(downloadPath, { recursive: true });

        const response = await axios.get(downloadUrl, { responseType: "stream" });
        const writer = createWriteStream(filePath);

        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        return {
            url: modUrl,
            success: true,
            message: `Downloaded ${fileName}`,
            fileName
        };
    } catch (error: any) {
        return {
            url: modUrl,
            success: false,
            message: `Error: ${error.message || "Unknown error"}`
        };
    }
}
