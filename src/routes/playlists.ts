import { Router } from 'express';
import { PlaylistController } from '../controllers/playlistController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
const playlistController = new PlaylistController();

// All routes require authentication
router.use(authenticateToken);

// Playlist CRUD operations
router.post('/', playlistController.createPlaylist.bind(playlistController));
router.get('/', playlistController.getUserPlaylists.bind(playlistController));
router.get('/:id', playlistController.getPlaylist.bind(playlistController));
router.put('/:id', playlistController.updatePlaylist.bind(playlistController));
router.delete('/:id', playlistController.deletePlaylist.bind(playlistController));

// Mod management within playlists
router.post('/:id/mods', playlistController.addModToPlaylist.bind(playlistController));
router.delete('/:id/mods', playlistController.removeModFromPlaylist.bind(playlistController));
router.get('/:id/mods/check', playlistController.checkModInPlaylist.bind(playlistController));

// Utility routes
router.get('/mods/containing', playlistController.getPlaylistsContainingMod.bind(playlistController));

export default router;
