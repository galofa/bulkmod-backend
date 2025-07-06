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

// Enable CORS for frontend origin
app.use(cors({
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true
}));

app.use(express.json());

// API routes
app.use("/api", downloadModsRouter);

// Serve mods.zip files
app.use("/downloads", express.static(path.join(__dirname, "../downloads")));

// ✅ DO NOT try to serve frontend here (your frontend is on Vercel)

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Backend listening on http://localhost:${PORT}`);
});
