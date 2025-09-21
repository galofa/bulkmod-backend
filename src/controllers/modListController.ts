import { Request, Response } from 'express';
import { ModListService } from '../services/modListService';
import { authenticateToken } from '../middleware/authMiddleware';
import axios from 'axios';

const modListService = new ModListService();

export class ModListController {
  // Create a new modlist
  async createModList(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        console.error('createModList: userId is missing or undefined. req.user:', (req as any).user);
        return res.status(401).json({ error: 'User authentication failed: userId missing.' });
      }
      const { name, description, isPublic } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Mod List name is required' });
      }

      const modlist = await modListService.createModList(userId, {
        name,
        description,
        isPublic: isPublic || false,
      });

      res.status(201).json(modlist);
    } catch (error) {
      console.error('Error creating mod list:', error);
      res.status(500).json({ error: 'Failed to create mod list' });
    }
  }

  // Get all modlists for the authenticated user
  async getUserModLists(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const modlists = await modListService.getUserModLists(userId);
      res.json(modlists);
    } catch (error) {
      console.error('Error fetching mod lists:', error);
      res.status(500).json({ error: 'Failed to fetch mod lists' });
    }
  }

  // Get a specific modlist
  async getModList(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const modListId = parseInt(req.params.id);

      if (isNaN(modListId)) {
        return res.status(400).json({ error: 'Invalid mod list ID' });
      }

      const modlist = await modListService.getModList(modListId, userId);
      
      if (!modlist) {
        return res.status(404).json({ error: 'Mod list not found' });
      }

      res.json(modlist);
    } catch (error) {
      console.error('Error fetching mod list:', error);
      res.status(500).json({ error: 'Failed to fetch mod list' });
    }
  }

  // Update modlist details
  async updateModList(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const modListId = parseInt(req.params.id);
      const { name, description, isPublic } = req.body;

      if (isNaN(modListId)) {
        return res.status(400).json({ error: 'Invalid mod list ID' });
      }

      const result = await modListService.updateModList(modListId, userId, {
        name,
        description,
        isPublic,
      });

      if (result.count === 0) {
        return res.status(404).json({ error: 'Mod list not found or access denied' });
      }

      res.json({ message: 'Mod list updated successfully' });
    } catch (error) {
      console.error('Error updating mod list:', error);
      res.status(500).json({ error: 'Failed to update mod list' });
    }
  }

  // Delete a modlist
  async deleteModList(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const modListId = parseInt(req.params.id);

      if (isNaN(modListId)) {
        return res.status(400).json({ error: 'Invalid mod list ID' });
      }

      const result = await modListService.deleteModList(modListId, userId);

      if (result.count === 0) {
        return res.status(404).json({ error: 'Mod list not found or access denied' });
      }

      res.json({ message: 'Mod list deleted successfully' });
    } catch (error) {
      console.error('Error deleting mod list:', error);
      res.status(500).json({ error: 'Failed to delete mod list' });
    }
  }

  // Add a mod to a modlist
  async addModToModList(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const modListId = parseInt(req.params.id);
      const { modSlug, modTitle, modIconUrl, modAuthor } = req.body;

      if (isNaN(modListId)) {
        return res.status(400).json({ error: 'Invalid mod list ID' });
      }

      if (!modSlug || !modTitle || !modAuthor) {
        return res.status(400).json({ error: 'Mod slug, title, and author are required' });
      }

      const modListMod = await modListService.addModToModList(modListId, userId, {
        modSlug,
        modTitle,
        modIconUrl,
        modAuthor,
      });

      res.status(201).json(modListMod);
    } catch (error) {
      console.error('Error adding mod to mod list:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to add mod to mod list' });
    }
  }

  // Remove a mod from a modlist
  async removeModFromModList(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const modListId = parseInt(req.params.id);
      const { modSlug } = req.body;

      if (isNaN(modListId)) {
        return res.status(400).json({ error: 'Invalid mod list ID' });
      }

      if (!modSlug) {
        return res.status(400).json({ error: 'Mod slug is required' });
      }

      const result = await modListService.removeModFromModList(modListId, userId, modSlug);

      if (result.count === 0) {
        return res.status(404).json({ error: 'Mod not found in mod list or access denied' });
      }

      res.json({ message: 'Mod removed from mod list successfully' });
    } catch (error) {
      console.error('Error removing mod from mod list:', error);
      res.status(500).json({ error: 'Failed to remove mod from mod list' });
    }
  }

  // Check if a mod is in a specific modlist
  async checkModInModList(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const modListId = parseInt(req.params.id);
      const { modSlug } = req.query;

      if (isNaN(modListId)) {
        return res.status(400).json({ error: 'Invalid mod list ID' });
      }

      if (!modSlug || typeof modSlug !== 'string') {
        return res.status(400).json({ error: 'Mod slug is required' });
      }

      const isInModList = await modListService.isModInModList(modListId, modSlug);
      res.json({ isInModList });
    } catch (error) {
      console.error('Error checking mod in mod list:', error);
      res.status(500).json({ error: 'Failed to check mod in mod list' });
    }
  }

  // Get all modlists containing a specific mod
  async getModListsContainingMod(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const { modSlug } = req.query;

      if (!modSlug || typeof modSlug !== 'string') {
        return res.status(400).json({ error: 'Mod slug is required' });
      }

      const modlists = await modListService.getModListsContainingMod(userId, modSlug);
      res.json(modlists);
    } catch (error) {
      console.error('Error fetching mod lists containing mod:', error);
      res.status(500).json({ error: 'Failed to fetch mod lists containing mod' });
    }
  }

  // Fetch mod details from Modrinth API
  async fetchModDetails(req: Request, res: Response) {
    try {
      const { modSlug } = req.params;

      if (!modSlug) {
        return res.status(400).json({ error: 'Mod slug is required' });
      }

      // Fetch mod details from Modrinth API
      const response = await axios.get(`https://api.modrinth.com/v2/project/${modSlug}`);
      const modData = response.data;

      // Extract the necessary information
      const modDetails = {
        slug: modData.slug,
        title: modData.title,
        author: modData.author,
        iconUrl: modData.icon_url,
        description: modData.description,
        projectType: modData.project_type
      };

      res.json(modDetails);
    } catch (error) {
      console.error('Error fetching mod details:', error);
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return res.status(404).json({ error: 'Mod not found' });
      }
      res.status(500).json({ error: 'Failed to fetch mod details' });
    }
  }

  // Import mod list with API fetching
  async importModList(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const { name, description, modUrls } = req.body;

      if (!name || !modUrls || !Array.isArray(modUrls)) {
        return res.status(400).json({ error: 'Name and mod URLs are required' });
      }

      // Create the mod list first
      const modlist = await modListService.createModList(userId, {
        name,
        description: description || 'Imported from file',
        isPublic: false,
      });

      // Process each mod URL
      const modPromises = modUrls.map(async (url: string) => {
        try {
          // Extract slug from URL (support both /mod and /plugin)
          const slugMatch = url.match(/modrinth\.com\/(mod|plugin)\/([^/]+)/);
          if (!slugMatch) {
            console.warn(`Invalid URL format: ${url}`);
            return null;
          }
          
          const slug = slugMatch[2];
          
          // Fetch mod details from API
          const response = await axios.get(`https://api.modrinth.com/v2/project/${slug}`);
          const modData = response.data;

          // Add mod to the mod list
          const result = await modListService.addModToModList(modlist.id, userId, {
            modSlug: slug,
            modTitle: modData.title,
            modIconUrl: modData.icon_url,
            modAuthor: modData.author || 'Unknown Author',
          });
          return result;
        } catch (error) {
          console.error(`Failed to process mod URL ${url}:`, error);
          return null;
        }
      });

      // Wait for all mods to be processed
      const results = await Promise.all(modPromises);
      const successfulMods = results.filter(mod => mod !== null);

      res.status(201).json({
        modlist,
        importedMods: successfulMods.length,
        totalMods: modUrls.length,
        failedMods: modUrls.length - successfulMods.length
      });
    } catch (error) {
      console.error('Error importing mod list:', error);
      res.status(500).json({ error: 'Failed to import mod list' });
    }
  }
}
