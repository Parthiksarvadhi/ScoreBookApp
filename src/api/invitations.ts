import { apiClient } from './client';

export const invitationsApi = {
    /**
     * Invite a player to a team by mobile number
     */
    invitePlayer: async (teamId: string, mobileNumber: string) => {
        const response = await apiClient.post<any>(`/invitations/teams/${teamId}/invite`, {
            mobileNumber
        });
        // Backend returns { message, data: { invitation, isNewUser, ... } }
        return response.data.data;
    },

    /**
     * Get pending invitations for the current user
     */
    getPendingInvitations: async () => {
        const response = await apiClient.get('/invitations/pending');
        return response.data.data;
    },

    /**
     * Get invitation details by token
     */
    getInvitationByToken: async (token: string) => {
        const response = await apiClient.get(`/invitations/token/${token}`);
        return response.data.data;
    },

    /**
     * Accept an invitation
     */
    acceptInvitation: async (invitationId: string) => {
        const response = await apiClient.post(`/invitations/${invitationId}/accept`);
        return response.data;
    },

    /**
     * Reject an invitation
     */
    rejectInvitation: async (invitationId: string) => {
        const response = await apiClient.post(`/invitations/${invitationId}/reject`);
        return response.data;
    }
};
