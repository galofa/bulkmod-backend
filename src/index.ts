import express from "express";
import cors from "cors";
import downloadModsRouter from "./routes/downloadMods";
import path from "path";

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.use("/api/download-mods", downloadModsRouter);

// Serve downloaded files statically
app.use("/downloads", express.static(path.join(__dirname, "../downloads")));

app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
});
