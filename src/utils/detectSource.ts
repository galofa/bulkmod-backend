export default function detectSource(url: string): "modrinth" | "invalid" {
    if (url.includes("modrinth.com")) return "modrinth";
    return "invalid";
}
