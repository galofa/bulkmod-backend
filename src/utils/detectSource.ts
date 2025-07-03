export default function detectSource(url: string): "modrinth" | "curseforge" | "github" | "custom" | "unknown" {
    const lower = url.toLowerCase();

    if (lower.includes("modrinth.com")) return "modrinth";
    if (lower.includes("curseforge.com")) return "curseforge";
    if (lower.includes("github.com")) return "github";

    // If it looks like URL but no match, mark as custom
    try {
        new URL(url);
        return "custom";
    } catch {
        return "unknown";
    }
}
