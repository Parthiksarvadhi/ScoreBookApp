
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { matchesApi } from '../../api/matches';
import { Ball } from '../../types';

// Types (mirrored from backend/frontend types)
interface Player {
    playerId: string;
    playerName: string;
}

interface CurrentMatchState {
    striker: Player;
    nonStriker: Player;
    bowler: Player;
    currentOver: number;
    currentBall: number;
    legalBallsInOver: number;
}

interface LiveScore {
    battingTeam: {
        id: string;
        teamName: string;
        runs: number;
        wickets: number;
        overs: string;
        runRate: number;
    };
    fieldingTeam: {
        id: string;
        teamName: string;
    };
    striker?: {
        playerName: string;
        runs: number;
    };
    nonStriker?: {
        playerName: string;
        runs: number;
    };
}

interface MatchState {
    currentState: CurrentMatchState | null;
    nextState: CurrentMatchState | null; // Preview
    liveScore: LiveScore | null;
    balls: Ball[];

    loading: boolean;
    recording: boolean; // separate loading state for record action
    error: string | null;
}

const initialState: MatchState = {
    currentState: null,
    nextState: null,
    liveScore: null,
    balls: [],
    loading: false,
    recording: false,
    error: null,
};

// Async Thunks
export const fetchMatchData = createAsyncThunk(
    'match/fetchData',
    async (matchId: string, { rejectWithValue }) => {
        try {
            const [state, score, balls] = await Promise.all([
                matchesApi.getCurrentState(matchId),
                matchesApi.getLiveScore(matchId),
                matchesApi.getBalls(matchId),
            ]);
            return { state, score, balls };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch match data');
        }
    }
);

export const previewBall = createAsyncThunk(
    'match/previewBall',
    async (payload: { matchId: string; data: any }, { rejectWithValue }) => {
        try {
            const response = await matchesApi.getNextState(payload.matchId, payload.data);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to preview state');
        }
    }
);

export const recordBall = createAsyncThunk(
    'match/recordBall',
    async (payload: { matchId: string; data: any }, { dispatch, rejectWithValue }) => {
        try {
            const response = await matchesApi.recordBall(payload.matchId, payload.data);
            // Refresh data after successful record
            dispatch(fetchMatchData(payload.matchId));
            return response;
        } catch (error: any) {
            const message = error.response?.data?.error?.message || error.response?.data?.error || error.message || 'Failed to record ball';
            return rejectWithValue(message);
        }
    }
);

const matchSlice = createSlice({
    name: 'match',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearNextState: (state) => {
            state.nextState = null;
        },
        resetMatchState: () => initialState,
    },
    extraReducers: (builder) => {
        // Fetch Data
        builder.addCase(fetchMatchData.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchMatchData.fulfilled, (state, action) => {
            state.loading = false;
            state.currentState = action.payload.state;
            state.liveScore = action.payload.score;
            state.balls = action.payload.balls;
        });
        builder.addCase(fetchMatchData.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload as string;
        });

        // Preview Ball
        builder.addCase(previewBall.fulfilled, (state, action) => {
            state.nextState = action.payload;
        });
        // (Optional: handle preview errors silently or show toast)

        // Record Ball
        builder.addCase(recordBall.pending, (state) => {
            state.recording = true;
            state.error = null;
        });
        builder.addCase(recordBall.fulfilled, (state) => {
            state.recording = false;
            state.nextState = null; // Clear preview on success
        });
        builder.addCase(recordBall.rejected, (state, action) => {
            state.recording = false;
            state.error = action.payload as string;
        });
    },
});

export const { clearError, clearNextState, resetMatchState } = matchSlice.actions;
export default matchSlice.reducer;
