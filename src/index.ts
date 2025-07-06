import express from "express";
import cors from "cors";
import downloadModsRouter from "./routes/downloadMods";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";

// CORS for frontend origin
app.use(cors({
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true
}));

app.use(express.json());

// API routes
app.use("/api", downloadModsRouter);

// Static route for downloading mods.zip
app.use("/downloads", express.static(path.join(__dirname, "../downloads")));

// Optional: serve frontend (for fullstack hosting, e.g. on Vercel/Render with frontend build)
const frontendPath = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendPath));
app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(PORT, () => {
    console.log(`🚀 Backend listening on http://localhost:${PORT}`);
});
