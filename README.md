# 🧩 Minecraft Mod Downloader - Backend

This is the backend service for the Minecraft Mod Downloader project. It allows users to upload a .txt file containing Modrinth mod URLs and automatically downloads the latest compatible versions for a specified Minecraft version and mod loader. The downloaded mods are zipped and served back to the frontend in real time via Server-Sent Events (SSE).

---

## 🚀 Features

- Upload a plain text file containing Modrinth URLs
- Automatically detect and fetch compatible mod versions
- Real-time progress updates via SSE
- Mods are zipped and returned as a single archive
- Automatic cleanup of old uploads/downloads

## 🛠️ Tech Stack

- Node.js + Express
- TypeScript
- Axios
- Multer (file uploads)
- Archiver (ZIP creation)
- Server-Sent Events (real-time progress)

## 📁 Project Structure

```
backend/
├── downloads/               # Output zip files and downloaded mods (auto-cleaned)
├── uploads/                 # Temporary uploaded .txt files (auto-cleaned)
├── src/
│   ├── routes/
│   │   └── downloadMods.ts  # Main API logic (upload, progress, SSE)
│   ├── utils/
│   │   ├── detectSource.ts  # Detects source from URL
│   │   └── modrinth.ts      # Modrinth download logic
│   └── index.ts             # Express entry point
├── .env
```

---

## ▶️ Running Locally

### 📦 Installation

```git
git clone git@github.com:galofa/minecraft-mod-downloader-backend.git
```

```bash
cd minecraft-mod-downloader-backend
npm install
```

### ⚙️ Setting up Environment Variables

```bash
cp .env.template .env
```

Fill it with the following values:

```env
PORT=4000
BASE_URL=http://localhost:4000
CLIENT_ORIGIN=http://localhost:5173
```

### ▶️ Running the Server

```bash
npm run dev
```

---

## 🧪 API Endpoints

### POST /api/upload-mods

Uploads a `.txt` file containing Modrinth mod URLs.

- Headers: multipart/form-data
- Body:
  - mcVersion: string
  - modLoader: string (e.g. forge, fabric, quilt)
  - modsFile: text file (.txt)

📄 Response:
```json
{
  "jobId": "job_id", 
  "totalMods": "total_amount_of_mods"
}
```

### GET /api/progress/:jobId

SSE endpoint. Streams real-time download progress.

- Events:
  - message: individual mod result
  - done: final zip URL or error

### GET /api/results/:jobId

Returns full array of download results (success/failure) for the job.

📄 Response:
```json
{
  "results": [
    { "url": "the_url", "success": "true/false", "message": "response_message" },
  ]
}
```

---

## 🧼 Auto Cleanup

Files older than 2 minutes are automatically deleted from:
- /uploads
- /downloads (except active zips)

---

## ✨ Notes

- Only Modrinth links are supported for now (more sources planned for future updates)
- Your frontend should listen to the SSE stream before starting upload to ensure it captures all events.

---

## 🧙‍♂️ Example .txt File

```
https://modrinth.com/mod/fabric-api
https://modrinth.com/mod/lithium
https://modrinth.com/mod/sodium
```

---

## 🔒 CORS

CORS is enabled using CLIENT_ORIGIN from the .env file.
