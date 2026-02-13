import { apiClient } from './client';
import { Match, Scorecard, LiveScore, Ball } from '../types';

export const matchesApi = {
  createMatch: async (name: string, matchType: string, overs: number, venue: string, team1Id: string, team2Id: string) => {
    const response = await apiClient.post<any>('/matches', {
      name,
      matchType,
      overs,
      venue,
      teamAId: team1Id,
      teamBId: team2Id,
    });
    return response.data;
  },

  updateMatch: async (matchId: string, data: any) => {
    const response = await apiClient.put<any>(`/matches/${matchId}`, data);
    return response.data;
  },

  getMatches: async (filters?: { status?: string; createdBy?: string; scorerId?: string }) => {
    const response = await apiClient.get<any>('/matches', { params: filters });
    return response.data.data || response.data;
  },

  getMatch: async (matchId: string) => {
    const response = await apiClient.get<Match>(`/matches/${matchId}`);
    return response.data;
  },

  startMatch: async (matchId: string, initialPlayers?: { strikerId: string; nonStrikerId: string; bowlerId: string }) => {
    const response = await apiClient.post<Match>(`/matches/${matchId}/start`, { initialPlayers });
    return response.data;
  },

  endMatch: async (matchId: string) => {
    const response = await apiClient.post<Match>(`/matches/${matchId}/end`, {});
    return response.data;
  },

  abandonMatch: async (matchId: string) => {
    const response = await apiClient.post<Match>(`/matches/${matchId}/abandon`, {});
    return response.data;
  },

  resetMatch: async (matchId: string) => {
    const response = await apiClient.post<Match>(`/matches/${matchId}/reset`, {});
    return response.data;
  },

  recordToss: async (matchId: string, tossWinnerId: string, choice: 'bat' | 'field') => {
    const response = await apiClient.post<Match>(`/matches/${matchId}/toss`, {
      tossWinnerId,
      tossChoice: choice,
    });
    return response.data;
  },

  updateToss: async (matchId: string, tossWinnerId: string, choice: 'bat' | 'field') => {
    const response = await apiClient.put<Match>(`/matches/${matchId}/toss`, {
      tossWinnerId,
      tossChoice: choice,
    });
    return response.data;
  },

  selectPlaying11: async (matchId: string, teamId: string, playerIds: string[]) => {
    const response = await apiClient.post(`/matches/${matchId}/playing-11`, {
      teamId,
      playerIds,
    });
    return response.data;
  },

  updatePlaying11: async (matchId: string, teamId: string, playerIds: string[]) => {
    const response = await apiClient.put(`/matches/${matchId}/playing-11`, {
      teamId,
      playerIds,
    });
    return response.data;
  },

  designateCaptain: async (matchId: string, teamId: string, playerId: string) => {
    const response = await apiClient.post(`/matches/${matchId}/captain`, {
      teamId,
      captainId: playerId,
    });
    return response.data;
  },

  setBattingOrder: async (matchId: string, teamId: string, playerIds: string[]) => {
    const response = await apiClient.post(`/matches/${matchId}/batting-order`, {
      teamId,
      playerIds,
    });
    return response.data;
  },

  recordBall: async (matchId: string, ballData: any) => {
    const response = await apiClient.post<Ball>(`/matches/${matchId}/balls`, ballData);
    return response.data;
  },

  getBalls: async (matchId: string, inningsNumber?: number) => {
    const params = inningsNumber ? { inningsNumber } : {};
    const response = await apiClient.get<any>(`/matches/${matchId}/balls`, { params });
    // Backend returns { data: [...], pagination: {...} }
    return response.data.data || response.data || [];
  },

  updateBall: async (matchId: string, ballId: string, ballData: any) => {
    const response = await apiClient.put<Ball>(`/matches/${matchId}/balls/${ballId}`, ballData);
    return response.data;
  },

  deleteBall: async (matchId: string, ballId: string) => {
    const response = await apiClient.delete(`/matches/${matchId}/balls/${ballId}`);
    return response.data;
  },

  getScorecard: async (matchId: string) => {
    const response = await apiClient.get<Scorecard>(`/matches/${matchId}/scorecard`);
    return response.data;
  },

  getCurrentState: async (matchId: string) => {
    const response = await apiClient.get<any>(`/matches/${matchId}/current-state`);
    return response.data;
  },

  getNextState: async (matchId: string, ballData: any) => {
    const response = await apiClient.post<any>(`/matches/${matchId}/next-state`, ballData);
    return response.data;
  },

  getLiveScore: async (matchId: string) => {
    const response = await apiClient.get<any>(`/matches/${matchId}/live-score`);
    // Backend returns data directly, not wrapped
    return response.data;
  },

  getInningsInfo: async (matchId: string) => {
    const response = await apiClient.get(`/matches/${matchId}/innings`);
    return response.data;
  },

  completeInnings: async (matchId: string) => {
    const response = await apiClient.post(`/matches/${matchId}/innings/complete`, {});
    return response.data;
  },

  undoLastBall: async (matchId: string) => {
    const response = await apiClient.post(`/matches/${matchId}/undo`, {});
    return response.data;
  },
};
