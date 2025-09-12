import express, { Request, Response } from "express";
import axios from "axios";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
    const q = req.query.q as string;
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;
    const sort = req.query.sort as string || "relevance";

    if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Missing or invalid query parameter 'q'" });
    }

    try {        
        const searchParams: any = {
            query: q,
            limit,
            offset,
            facets: JSON.stringify([["project_type:mod"]]),
        };

        if (sort && sort !== "relevance") {
            switch (sort) {
                case "downloads":
                    searchParams.index = "downloads";
                    break;
                case "follows":
                    searchParams.index = "follows";
                    break;
                case "created":
                    searchParams.index = "newest";
                    break;
                case "updated":
                    searchParams.index = "updated";
                    break;
                default:
                    break;
            }
        }

        const modrinthRes = await axios.get("https://api.modrinth.com/v2/search", {
            params: searchParams,
        });
        
        res.json(modrinthRes.data);
    } catch (error: any) {
        res.status(500).json({
            error: "Failed to fetch from Modrinth",
            detail: error?.response?.data || error.message,
        });
    }
});

export default router;
