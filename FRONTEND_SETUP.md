# ScoreBook Frontend Setup Guide

## Overview
This is a React Native frontend for the ScoreBook cricket scoring system, built with Expo and TypeScript.

## Features
- User authentication (login/register)
- Team management (create teams, add players)
- Match management (create, view, manage matches)
- Ball-by-ball scoring
- Live scorecard
- User profile management

## Prerequisites
- Node.js 16+ and npm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

## Installation

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure API URL:
   - Copy `.env.example` to `.env`
   - Update `EXPO_PUBLIC_API_URL` to match your backend URL
   - Default: `http://localhost:3000/api`

## Running the App

### Development Server
```bash
npm start
```

### iOS Simulator
```bash
npm run ios
```

### Android Emulator
```bash
npm run android
```

### Web Browser
```bash
npm run web
```

## Project Structure

```
frontend/
├── src/
│   ├── api/              # API client and endpoints
│   │   ├── client.ts     # Axios client with interceptors
│   │   ├── auth.ts       # Authentication endpoints
│   │   ├── teams.ts      # Team management endpoints
│   │   └── matches.ts    # Match management endpoints
│   ├── context/          # React context (Auth)
│   ├── screens/          # Screen components
│   │   ├── auth/         # Login/Register screens
│   │   ├── matches/      # Match screens
│   │   ├── teams/        # Team screens
│   │   └── profile/      # Profile screen
│   ├── navigation/       # Navigation setup
│   └── types/            # TypeScript types
├── app/                  # Expo Router entry point
└── package.json
```

## API Integration

### Authentication Flow
1. User registers or logs in
2. Backend returns access token + refresh token
3. Tokens stored in secure storage (expo-secure-store)
4. Tokens automatically included in API requests
5. Automatic token refresh on expiry

### Key API Endpoints

**Auth:**
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user

**Teams:**
- `POST /teams` - Create team
- `GET /teams` - List teams
- `POST /teams/{id}/players` - Add player

**Matches:**
- `POST /matches` - Create match
- `GET /matches` - List matches
- `POST /matches/{id}/start` - Start match
- `POST /matches/{id}/balls` - Record ball
- `GET /matches/{id}/live-score` - Get live score

## Environment Variables

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

## Development Tips

### Hot Reload
- Press `r` in terminal to reload
- Press `i` for iOS simulator
- Press `a` for Android emulator

### Debugging
- Use React Native Debugger
- Check console output in terminal
- Use `console.log()` for debugging

### Testing API Calls
- Use Postman or similar tool to test backend
- Verify backend is running before starting frontend
- Check network tab in browser dev tools (web)

## Common Issues

### API Connection Failed
- Ensure backend is running on correct port
- Check `EXPO_PUBLIC_API_URL` in `.env`
- For Android emulator, use `10.0.2.2` instead of `localhost`

### Token Expiry
- Tokens automatically refresh
- If refresh fails, user is logged out
- Check backend token configuration

### Build Issues
- Clear cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## Next Steps

1. Implement match detail screen with ball-by-ball scoring
2. Add real-time updates using WebSockets
3. Implement scorecard display
4. Add admin features (force release locks, etc.)
5. Add statistics and analytics
6. Implement offline mode with local storage

## Support

For issues or questions, check:
- Backend API documentation: `backend/COMPLETE_API_TESTING_GUIDE.md`
- Backend setup: `backend/SETUP_GUIDE.md`
