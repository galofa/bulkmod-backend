import { Request, Response } from 'express';
import { PlaylistService } from '../services/playlistService';
import { authenticateToken } from '../middleware/authMiddleware';

const playlistService = new PlaylistService();

export class PlaylistController {
  // Create a new playlist
  async createPlaylist(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { name, description, isPublic } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Playlist name is required' });
      }

      const playlist = await playlistService.createPlaylist(userId, {
        name,
        description,
        isPublic: isPublic || false,
      });

      res.status(201).json(playlist);
    } catch (error) {
      console.error('Error creating playlist:', error);
      res.status(500).json({ error: 'Failed to create playlist' });
    }
  }

  // Get all playlists for the authenticated user
  async getUserPlaylists(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const playlists = await playlistService.getUserPlaylists(userId);
      res.json(playlists);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      res.status(500).json({ error: 'Failed to fetch playlists' });
    }
  }

  // Get a specific playlist
  async getPlaylist(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const playlistId = parseInt(req.params.id);

      if (isNaN(playlistId)) {
        return res.status(400).json({ error: 'Invalid playlist ID' });
      }

      const playlist = await playlistService.getPlaylist(playlistId, userId);
      
      if (!playlist) {
        return res.status(404).json({ error: 'Playlist not found' });
      }

      res.json(playlist);
    } catch (error) {
      console.error('Error fetching playlist:', error);
      res.status(500).json({ error: 'Failed to fetch playlist' });
    }
  }

  // Update playlist details
  async updatePlaylist(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const playlistId = parseInt(req.params.id);
      const { name, description, isPublic } = req.body;

      if (isNaN(playlistId)) {
        return res.status(400).json({ error: 'Invalid playlist ID' });
      }

      const result = await playlistService.updatePlaylist(playlistId, userId, {
        name,
        description,
        isPublic,
      });

      if (result.count === 0) {
        return res.status(404).json({ error: 'Playlist not found or access denied' });
      }

      res.json({ message: 'Playlist updated successfully' });
    } catch (error) {
      console.error('Error updating playlist:', error);
      res.status(500).json({ error: 'Failed to update playlist' });
    }
  }

  // Delete a playlist
  async deletePlaylist(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const playlistId = parseInt(req.params.id);

      if (isNaN(playlistId)) {
        return res.status(400).json({ error: 'Invalid playlist ID' });
      }

      const result = await playlistService.deletePlaylist(playlistId, userId);

      if (result.count === 0) {
        return res.status(404).json({ error: 'Playlist not found or access denied' });
      }

      res.json({ message: 'Playlist deleted successfully' });
    } catch (error) {
      console.error('Error deleting playlist:', error);
      res.status(500).json({ error: 'Failed to delete playlist' });
    }
  }

  // Add a mod to a playlist
  async addModToPlaylist(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const playlistId = parseInt(req.params.id);
      const { modSlug, modTitle, modIconUrl, modAuthor } = req.body;

      if (isNaN(playlistId)) {
        return res.status(400).json({ error: 'Invalid playlist ID' });
      }

      if (!modSlug || !modTitle || !modAuthor) {
        return res.status(400).json({ error: 'Mod slug, title, and author are required' });
      }

      const playlistMod = await playlistService.addModToPlaylist(playlistId, userId, {
        modSlug,
        modTitle,
        modIconUrl,
        modAuthor,
      });

      res.status(201).json(playlistMod);
    } catch (error) {
      console.error('Error adding mod to playlist:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to add mod to playlist' });
    }
  }

  // Remove a mod from a playlist
  async removeModFromPlaylist(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const playlistId = parseInt(req.params.id);
      const { modSlug } = req.body;

      if (isNaN(playlistId)) {
        return res.status(400).json({ error: 'Invalid playlist ID' });
      }

      if (!modSlug) {
        return res.status(400).json({ error: 'Mod slug is required' });
      }

      const result = await playlistService.removeModFromPlaylist(playlistId, userId, modSlug);

      if (result.count === 0) {
        return res.status(404).json({ error: 'Mod not found in playlist or access denied' });
      }

      res.json({ message: 'Mod removed from playlist successfully' });
    } catch (error) {
      console.error('Error removing mod from playlist:', error);
      res.status(500).json({ error: 'Failed to remove mod from playlist' });
    }
  }

  // Check if a mod is in a specific playlist
  async checkModInPlaylist(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const playlistId = parseInt(req.params.id);
      const { modSlug } = req.query;

      if (isNaN(playlistId)) {
        return res.status(400).json({ error: 'Invalid playlist ID' });
      }

      if (!modSlug || typeof modSlug !== 'string') {
        return res.status(400).json({ error: 'Mod slug is required' });
      }

      const isInPlaylist = await playlistService.isModInPlaylist(playlistId, modSlug);
      res.json({ isInPlaylist });
    } catch (error) {
      console.error('Error checking mod in playlist:', error);
      res.status(500).json({ error: 'Failed to check mod in playlist' });
    }
  }

  // Get all playlists containing a specific mod
  async getPlaylistsContainingMod(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { modSlug } = req.query;

      if (!modSlug || typeof modSlug !== 'string') {
        return res.status(400).json({ error: 'Mod slug is required' });
      }

      const playlists = await playlistService.getPlaylistsContainingMod(userId, modSlug);
      res.json(playlists);
    } catch (error) {
      console.error('Error fetching playlists containing mod:', error);
      res.status(500).json({ error: 'Failed to fetch playlists containing mod' });
    }
  }
}
