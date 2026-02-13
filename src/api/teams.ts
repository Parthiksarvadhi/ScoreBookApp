import { Platform } from 'react-native';
import { apiClient } from './client';
import { Team, Player } from '../types';

export const teamsApi = {
  createTeam: async (name: string, shortName: string, logo?: string, primaryColor?: string) => {
    const response = await apiClient.post<Team>('/matches/teams', {
      name,
      shortName,
      logo,
      primaryColor
    });
    return response.data;
  },

  getTeams: async (userId?: string) => {
    const url = userId ? `/matches/teams?userId=${userId}` : '/matches/teams';
    const response = await apiClient.get<any>(url);
    // Backend returns { data: teams }
    console.log(response.data.data || response.data)
    return response.data.data || response.data;
    console.log(response.data.data || response.data)
  },

  getTeam: async (teamId: string) => {
    const response = await apiClient.get<Team>(`/matches/teams/${teamId}`);
    return response.data;
  },

  updateTeam: async (teamId: string, data: { name?: string; shortName?: string; logo?: string; primaryColor?: string }) => {
    const response = await apiClient.put<Team>(`/matches/teams/${teamId}`, data);
    return response.data;
  },

  uploadImage: async (uri: string): Promise<string> => {
    const formData = new FormData();
    // Android often requires the file:// prefix for FormData
    const platformUri = Platform.OS === 'android' && !uri.startsWith('file://') ? `file://${uri}` : uri;
    const filename = uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    console.error('📸 Uploading image:', platformUri);
    console.error('📄 Filename:', filename);
    console.error('Types:', type);

    formData.append('image', {
      uri: platformUri,
      name: filename,
      type,
    } as any);

    const uploadUrl = `${apiClient.baseUrl}/upload`;
    console.error('🚀 Upload URL:', uploadUrl);

    // Use fetch instead of axios for file upload to avoid common React Native FormData issues
    const token = await apiClient.getToken();
    const response = await fetch(`${apiClient.baseUrl}/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        // Explicitly do NOT set Content-Type so the browser/engine sets the boundary
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.url;
  },

  addPlayer: async (teamId: string, player: { name: string; jerseyNumber?: number; role: string }) => {
    const response = await apiClient.post<Player>(`/matches/teams/${teamId}/players`, {
      name: player.name,
      jerseyNumber: player.jerseyNumber || 0,
      role: player.role,
    });
    return response.data;
  },

  updatePlayer: async (teamId: string, playerId: string, data: Partial<Player>) => {
    const response = await apiClient.put<Player>(`/matches/teams/${teamId}/players/${playerId}`, data);
    return response.data;
  },

  deletePlayer: async (teamId: string, playerId: string) => {
    const response = await apiClient.delete(`/matches/teams/${teamId}/players/${playerId}`);
    return response.data;
  },

  getTeamPlayers: async (teamId: string) => {
    const response = await apiClient.get<any>(`/matches/teams/${teamId}/players`);
    // Backend returns { data: players }
    return response.data.data || response.data;
  },
};
