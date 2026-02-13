
import { configureStore } from '@reduxjs/toolkit';
import matchReducer from './slices/matchSlice';

export const store = configureStore({
    reducer: {
        match: matchReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false, // Useful if API returns non-serializable data (dates etc)
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
