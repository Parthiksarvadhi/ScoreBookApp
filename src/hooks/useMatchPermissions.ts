
import { useAuth } from '../context/AuthContext';
import { Match } from '../types';

export const useMatchPermissions = (match: Match | null) => {
    const { user } = useAuth();

    if (!match || !user) {
        return {
            canEdit: false,
            isCreator: false,
            isScorer: false,
            isLoading: !match && !user, // rudimentary loading check
        };
    }

    const isCreator = match.createdBy === user.id;
    const isScorer = match.scorerId === user.id;
    // Admin role should also have permissions
    const isAdmin = user.role === 'admin';

    return {
        canEdit: isCreator || isScorer || isAdmin,
        isCreator,
        isScorer,
        isAdmin,
        isLoading: false,
    };
};
