export default function detectSource(url: string): "modrinth" | "custom" {
    if (url.includes("modrinth.com")) return "modrinth";
    return "custom";
}
