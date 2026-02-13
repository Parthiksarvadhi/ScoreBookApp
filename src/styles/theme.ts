export const theme = {
    colors: {
        primary: '#2E7D32', // Cricket Green
        primaryDark: '#1B5E20',
        primaryLight: '#4CAF50',
        secondary: '#0288D1', // Blue for contrast (e.g., links)
        background: '#F3F4F6', // Neutral background
        surface: '#FFFFFF',
        text: {
            primary: '#1F2937',
            secondary: '#6B7280',
            hint: '#9CA3AF',
            inverse: '#FFFFFF',
        },
        border: '#E5E7EB',
        error: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B',
    },
    spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
        xxl: 48,
    },
    borderRadius: {
        s: 4,
        m: 8,
        l: 12,
        xl: 16,
        round: 9999,
    },
    typography: {
        h1: {
            fontSize: 32,
            fontWeight: '700',
            lineHeight: 40,
        },
        h2: {
            fontSize: 24,
            fontWeight: '600',
            lineHeight: 32,
        },
        h3: {
            fontSize: 20,
            fontWeight: '600',
            lineHeight: 28,
        },
        body: {
            fontSize: 16,
            lineHeight: 24,
        },
        bodySmall: {
            fontSize: 14,
            lineHeight: 20,
        },
        button: {
            fontSize: 16,
            fontWeight: '600',
            letterSpacing: 0.5,
        },
        caption: {
            fontSize: 12,
            lineHeight: 16,
            color: '#9CA3AF',
        },
    } as const,
    shadows: {
        small: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
        },
        medium: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 4,
        },
        large: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
        },
    },
};
