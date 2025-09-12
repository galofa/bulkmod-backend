import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreatePlaylistData {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface AddModToPlaylistData {
  modSlug: string;
  modTitle: string;
  modIconUrl?: string;
  modAuthor: string;
}

export class PlaylistService {
  // Create a new playlist
  async createPlaylist(userId: number, data: CreatePlaylistData) {
    return await prisma.playlist.create({
      data: {
        ...data,
        userId,
      },
      include: {
        mods: true,
      },
    });
  }

  // Get all playlists for a user
  async getUserPlaylists(userId: number) {
    return await prisma.playlist.findMany({
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

  // Get a specific playlist with its mods
  async getPlaylist(playlistId: number, userId: number) {
    return await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        userId,
      },
      include: {
        mods: {
          orderBy: { addedAt: 'desc' },
        },
      },
    });
  }

  // Update playlist details
  async updatePlaylist(playlistId: number, userId: number, data: Partial<CreatePlaylistData>) {
    return await prisma.playlist.updateMany({
      where: {
        id: playlistId,
        userId,
      },
      data,
    });
  }

  // Delete a playlist
  async deletePlaylist(playlistId: number, userId: number) {
    return await prisma.playlist.deleteMany({
      where: {
        id: playlistId,
        userId,
      },
    });
  }

  // Add a mod to a playlist
  async addModToPlaylist(playlistId: number, userId: number, modData: AddModToPlaylistData) {
    // Verify playlist belongs to user
    const playlist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        userId,
      },
    });

    if (!playlist) {
      throw new Error('Playlist not found or access denied');
    }

    return await prisma.playlistMod.create({
      data: {
        playlistId,
        ...modData,
      },
    });
  }

  // Remove a mod from a playlist
  async removeModFromPlaylist(playlistId: number, userId: number, modSlug: string) {
    // Verify playlist belongs to user
    const playlist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        userId,
      },
    });

    if (!playlist) {
      throw new Error('Playlist not found or access denied');
    }

    return await prisma.playlistMod.deleteMany({
      where: {
        playlistId,
        modSlug,
      },
    });
  }

  // Check if a mod is in a specific playlist
  async isModInPlaylist(playlistId: number, modSlug: string) {
    const playlistMod = await prisma.playlistMod.findUnique({
      where: {
        playlistId_modSlug: {
          playlistId,
          modSlug,
        },
      },
    });
    return !!playlistMod;
  }

  // Get all playlists containing a specific mod
  async getPlaylistsContainingMod(userId: number, modSlug: string) {
    return await prisma.playlist.findMany({
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
