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
): Promise<{ url: string; success: boolean; message: string; fileName?: string }> {
    //console.log("[modrinth] Starting downloadMod");
    const slug = extractSlug(modUrl);
    //console.log("[modrinth] Extracted slug:", slug);

    if (!slug) {
        //console.log("[modrinth] Invalid slug, exiting");
        return { url: modUrl, success: false, message: "Invalid Modrinth URL" };
    }

    try {
        //console.log("[modrinth] Fetching project info");
        const { data: project } = await axios.get(`${API_BASE}/project/${slug}`);
        //console.log("[modrinth] Project ID:", project.id);

        //console.log("[modrinth] Fetching project versions");
        const { data: versions } = await axios.get(`${API_BASE}/project/${project.id}/version`);
        //console.log("[modrinth] Number of versions found:", versions.length);

        const compatible = versions.find((version: any) =>
            version.game_versions.includes(mcVersion) &&
            version.loaders.includes(modLoader.toLowerCase())
        );

        if (!compatible) {
            console.log("[modrinth] No compatible version found");
            return {
                url: modUrl,
                success: false,
                message: `No match for ${mcVersion} (${modLoader})`
            };
        }

        console.log("[modrinth] Compatible version found:", compatible.version_number);

        const file = compatible.files[0];
        const downloadUrl = file.url;
        const fileName = file.filename;

        //console.log("[modrinth] Downloading file:", fileName, "from", downloadUrl);

        // ✅ Usa la ruta recibida como ya resuelta
        await fs.mkdir(downloadPath, { recursive: true });

        const filePath = path.join(downloadPath, fileName);

        const response = await axios.get(downloadUrl, { responseType: "stream" });
        const writer = createWriteStream(filePath);

        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
            writer.on("finish", () => {
                console.log("[modrinth] Download finished");
                resolve();
            });
            writer.on("error", (err) => {
                console.error("[modrinth] Download error", err);
                reject(err);
            });
        });

        //console.log("[modrinth] File saved to:", filePath);

        return {
            url: modUrl,
            success: true,
            message: `Downloaded ${fileName}`,
            fileName
        };
    } catch (error: any) {
        console.error("[modrinth] Caught error:", error.message || error);
        return {
            url: modUrl,
            success: false,
            message: `Error: ${error.message || "Unknown error"}`
        };
    }
}
