import { Router } from 'express';
import { ModListController } from '../controllers/modListController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
const modListController = new ModListController();

// All routes require authentication
router.use(authenticateToken);

// ModList CRUD operations
router.post('/', modListController.createModList.bind(modListController));
router.get('/', modListController.getUserModLists.bind(modListController));
router.get('/:id', modListController.getModList.bind(modListController));
router.put('/:id', modListController.updateModList.bind(modListController));
router.delete('/:id', modListController.deleteModList.bind(modListController));

// Mod management within modlists
router.post('/:id/mods', modListController.addModToModList.bind(modListController));
router.delete('/:id/mods', modListController.removeModFromModList.bind(modListController));
router.get('/:id/mods/check', modListController.checkModInModList.bind(modListController));

// Utility routes
router.get('/mods/containing', modListController.getModListsContainingMod.bind(modListController));

export default router;
