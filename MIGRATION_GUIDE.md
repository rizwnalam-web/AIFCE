# Migration Guide: Client-Side to Server-Side Architecture

## Overview

This guide explains how the application has been refactored from a localStorage + client-side LLM approach to a server-based architecture with PostgreSQL.

## What Changed

### Before (Client-Side)
- App state stored in browser localStorage
- LLM API calls made directly from React components
- No persistent data storage across devices
- No audit trail of API usage
- API keys exposed in client code

### After (Server-Side)
- App state persisted in PostgreSQL database
- All LLM calls routed through Express backend
- Data synchronized across all devices
- Full audit log of LLM requests
- API keys secured on server
- Multi-user support with user authentication ready

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           React Client (Vite)                   │
│  - UI Components                                │
│  - Local State Management                       │
│  - API Service Calls                            │
└────────────┬────────────────────────────────────┘
             │ HTTP/REST API
             ▼
┌─────────────────────────────────────────────────┐
│      Express Server (Node.js)                   │
│  - Route Handlers                               │
│  - LLM Integration                              │
│  - Prisma ORM                                   │
└────────────┬────────────────────────────────────┘
             │ Database Driver
             ▼
┌─────────────────────────────────────────────────┐
│       PostgreSQL Database                       │
│  - User Data                                    │
│  - App State                                    │
│  - Health History                               │
│  - API Audit Logs                               │
└─────────────────────────────────────────────────┘
```

## Step-by-Step Migration

### Step 1: Set Up Database

1. Install PostgreSQL on your machine or use Docker:
   ```bash
   docker run --name postgres-aifce -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
   ```

2. Update `.env` with your database URL:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create database schema:
   ```bash
   npm run db:push
   ```

5. Seed sample data:
   ```bash
   npm run db:seed
   ```

### Step 2: Update Your Components

Replace direct LLM calls with backend API calls:

**Before:**
```typescript
import { generateWeatherAnalysis } from './services/geminiService';

const analysis = await generateWeatherAnalysis(location, weatherData);
```

**After:**
```typescript
import backendAPI from './services/backendAPI';

// Set user ID once on app initialization
backendAPI.setUserId(userId);

// Make calls through API
const { analysis } = await backendAPI.analyzeWeather(location, weatherData);
```

### Step 3: Migrate App State

**Before:**
```typescript
const appState = JSON.parse(localStorage.getItem('farmAppState'));
```

**After:**
```typescript
import backendAPI from './services/backendAPI';

// Initialize (on first login)
const { userId, appState } = await backendAPI.initAppState(email);

// Get
const appState = await backendAPI.getAppState();

// Update
await backendAPI.updateAppState({ units: 'metric' });
```

### Step 4: Update Context Provider

Modify `AppContext` to sync with server:

```typescript
import backendAPI from '../services/backendAPI';

export const AppContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const { userId: newUserId, appState } = await backendAPI.initAppState('demo@farming.app');
      setUserId(newUserId);
      backendAPI.setUserId(newUserId);
      dispatch({ type: 'SET_STATE', payload: appState });
    };
    init();
  }, []);

  // Sync updates to server
  useEffect(() => {
    if (userId && state !== initialState) {
      backendAPI.updateAppState(state);
    }
  }, [state, userId]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
};
```

## API Endpoints Reference

### State Management
- **Initialize User**
  ```
  POST /api/app-state/init
  Body: { email: string }
  Returns: { userId, appState }
  ```

- **Get App State**
  ```
  GET /api/app-state/:userId
  Returns: { settings, hasCompletedOnboarding }
  ```

- **Update App State**
  ```
  PUT /api/app-state/:userId
  Body: { units?, theme?, temperatureUnit?, hasCompletedOnboarding? }
  ```

### Locations
- **Save Location**
  ```
  POST /api/app-state/locations/:userId
  Body: { name, moisture, latitude?, longitude? }
  ```

- **Get Locations**
  ```
  GET /api/app-state/locations/:userId
  ```

- **Delete Location**
  ```
  DELETE /api/app-state/locations/:userId/:name
  ```

### LLM Operations
- **Weather Analysis**
  ```
  POST /api/llm/weather-analysis
  Body: { location, weatherData, userId }
  Returns: { analysis }
  ```

- **Crop Health Analysis**
  ```
  POST /api/llm/crop-health
  Body: { cropType, description, imageBase64?, userId }
  Returns: { analysis }
  ```

- **Watering Recommendations**
  ```
  POST /api/llm/watering-recommendations
  Body: { cropType, location, weatherData, userId }
  Returns: { recommendations }
  ```

- **Fertilization Plan**
  ```
  POST /api/llm/fertilization
  Body: { cropType, soilData, weatherData, userId }
  Returns: { plan }
  ```

- **Weather Alerts**
  ```
  POST /api/llm/weather-alerts
  Body: { location, weatherData, userId }
  Returns: { alerts }
  ```

- **Crop Comparison**
  ```
  POST /api/llm/crop-comparison
  Body: { crops: string[], userId }
  Returns: { comparison }
  ```

- **Crop Encyclopedia**
  ```
  POST /api/llm/crop-encyclopedia
  Body: { cropName, userId }
  Returns: { info }
  ```

## Data Models

### User
```typescript
{
  id: string (UUID)
  email: string (unique)
  createdAt: Date
  updatedAt: Date
}
```

### AppState
```typescript
{
  id: string
  userId: string
  units: 'imperial' | 'metric'
  theme: 'dark' | 'light'
  temperatureUnit: 'fahrenheit' | 'celsius'
  hasCompletedOnboarding: boolean
}
```

### SavedLocation
```typescript
{
  id: string
  userId: string
  name: string
  moisture: string
  latitude: number?
  longitude: number?
}
```

### HealthHistoryEntry
```typescript
{
  id: string
  userId: string
  date: string
  cropType: string
  location: string
  healthDescription: string
  plan: string
  imageBase64: string?
  createdAt: Date
}
```

### LLMRequestLog
```typescript
{
  id: string
  userId: string?
  provider: string ('gemini', 'openai', etc.)
  endpoint: string
  requestType: string ('weather', 'crop_analysis', etc.)
  inputTokens: number?
  outputTokens: number?
  responseTime: number (milliseconds)
  status: 'success' | 'error'
  errorMessage: string?
  createdAt: Date
}
```

## Benefits of This Architecture

✅ **Data Persistence** - User data survives across sessions and devices
✅ **Security** - API keys remain on server, never exposed to client
✅ **Audit Trail** - Every LLM call is logged for compliance
✅ **Scalability** - Ready for multi-user, multi-tenant deployment
✅ **Performance** - Server-side caching of results
✅ **Multi-Device** - Sync across all user's devices
✅ **Monitoring** - Track API usage and costs
✅ **Offline Ready** - Foundation for service workers and offline support

## Common Tasks

### View Database
```bash
npx prisma studio
```

### Create Migration
```bash
npx prisma migrate dev --name add_new_table
```

### Reset Database (Dev Only)
```bash
npx prisma migrate reset
```

### Query Data
```bash
npx prisma db execute --stdin < query.sql
```

## Troubleshooting

**Q: Getting "App state not found" errors?**
A: Run `npm run db:seed` to initialize demo data

**Q: Database connection failing?**
A: Ensure PostgreSQL is running and DATABASE_URL is correct

**Q: LLM API calls failing?**
A: Check that GEMINI_API_KEY is set in .env

**Q: Changes not persisting?**
A: Verify backendAPI.setUserId() is called after user init

## Next Steps

1. Update all component imports to use backendAPI
2. Remove localStorage references
3. Test all features with database backend
4. Implement user authentication (optional)
5. Add error handling and loading states
6. Deploy database to production
7. Set up database backups

## Files Changed

- `package.json` - Added Prisma and database dependencies
- `server.ts` - Added database and API routes
- `server/db.ts` - Database connection management
- `server/llmService.ts` - Server-side LLM calls with logging
- `server/routes/appStateRoutes.ts` - App state API endpoints
- `server/routes/llmRoutes.ts` - LLM API endpoints
- `services/backendAPI.ts` - Client-side API service layer
- `prisma/schema.prisma` - Database schema definition
- `.env` - Environment configuration
- `DATABASE_SETUP.md` - Database setup instructions

## Questions?

Refer to:
- Prisma Docs: https://www.prisma.io/docs/
- Express Docs: https://expressjs.com/
- PostgreSQL Docs: https://www.postgresql.org/docs/
