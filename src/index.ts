import express from "express";
import cors from "cors";
import downloadModsRouter from "./routes/downloadMods";
import searchModsRouter from "./routes/searchMods";
import authRouter from "./routes/auth";
import playlistRouter from "./routes/playlists";
import path from "path";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";
import { prisma } from "./lib/prisma";

// Load environment variables
dotenv.config();

// Express app
const app = express();

// Port
const PORT = process.env.PORT || 4000;

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',  // Vite default port
    'http://localhost:5173',  // Vite alternative port
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    ...(process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN] : [])
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  optionsSuccessStatus: 200
};

// Enable CORS
app.use(cors(corsOptions));

// JSON middleware
app.use(express.json());

// Test database connection
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

// Initialize database connection
testDatabaseConnection();

// API routes
app.use("/api/auth", authRouter);
app.use("/api", downloadModsRouter);
app.use("/api/search-mods", searchModsRouter);
app.use("/api/playlists", playlistRouter);

// Serve mods.zip files
app.use("/downloads", express.static(path.join(__dirname, "../downloads")));

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`CORS enabled for origins:`, corsOptions.origin);
});
