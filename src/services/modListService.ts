import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateModListData {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface AddModToModListData {
  modSlug: string;
  modTitle: string;
  modIconUrl?: string;
  modAuthor: string;
}

export class ModListService {
  // Create a new modlist
  async createModList(userId: number, data: CreateModListData) {
    return await prisma.modList.create({
      data: {
        ...data,
        user: { connect: { id: userId } },
      },
      include: {
        mods: true,
      },
    });
  }

  // Get all modlists for a user
  async getUserModLists(userId: number) {
    return await prisma.modList.findMany({
      where: { userId },
      include: {
        mods: {
          orderBy: { addedAt: 'desc' },
        },
        _count: {
          select: { mods: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Get a specific modlist with its mods
  async getModList(modListId: number, userId: number) {
    return await prisma.modList.findFirst({
      where: {
        id: modListId,
        userId,
      },
      include: {
        mods: {
          orderBy: { addedAt: 'desc' },
        },
      },
    });
  }

  // Update modlist details
  async updateModList(modListId: number, userId: number, data: Partial<CreateModListData>) {
    return await prisma.modList.updateMany({
      where: {
        id: modListId,
        userId,
      },
      data,
    });
  }

  // Delete a modlist
  async deleteModList(modListId: number, userId: number) {
    return await prisma.modList.deleteMany({
      where: {
        id: modListId,
        userId,
      },
    });
  }

  // Add a mod to a modlist
  async addModToModList(modListId: number, userId: number, modData: AddModToModListData) {
    // Verify modlist belongs to user
    const modlist = await prisma.modList.findFirst({
      where: {
        id: modListId,
        userId,
      },
    });

    if (!modlist) {
      throw new Error('Mod List not found or access denied');
    }

    return await prisma.modListMod.create({
      data: {
        modListId,
        ...modData,
      },
    });
  }

  // Remove a mod from a modlist
  async removeModFromModList(modListId: number, userId: number, modSlug: string) {
    // Verify modlist belongs to user
    const modlist = await prisma.modList.findFirst({
      where: {
        id: modListId,
        userId,
      },
    });

    if (!modlist) {
      throw new Error('Mod List not found or access denied');
    }

    return await prisma.modListMod.deleteMany({
      where: {
        modListId,
        modSlug,
      },
    });
  }

  // Check if a mod is in a specific modlist
  async isModInModList(modListId: number, modSlug: string) {
    const modListMod = await prisma.modListMod.findUnique({
      where: {
        modListId_modSlug: {
          modListId,
          modSlug,
        },
      },
    });
    return !!modListMod;
  }

  // Get all modlists containing a specific mod
  async getModListsContainingMod(userId: number, modSlug: string) {
    return await prisma.modList.findMany({
      where: {
        userId,
        mods: {
          some: {
            modSlug,
          },
        },
      },
      include: {
        _count: {
          select: { mods: true },
        },
      },
    });
  }
}
