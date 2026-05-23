# Database Setup & Migration Guide

## Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 16+ installed

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Database Connection

Edit `.env` file with your PostgreSQL connection string:

```
DATABASE_URL="postgresql://username:password@localhost:5432/aifce_db"
```

**For local development with Docker:**

```bash
# Start PostgreSQL in Docker
docker run --name postgres-aifce -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres

# Then set DATABASE_URL in .env:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

### 3. Push Schema to Database

This creates all tables based on the Prisma schema:

```bash
npm run db:push
```

Or use migrations (recommended for production):

```bash
npm run db:migrate
```

### 4. Seed Database with Sample Data

```bash
npm run db:seed
```

This creates:
- Demo user account (demo@farming.app)
- Sample locations
- Default API configuration
- App state

## Database Schema Overview

### User Management
- **User** - Application users
- **AppState** - User settings and preferences

### Data Storage
- **SavedLocation** - User's tracked farm locations
- **ApiConfig** - Multiple API provider configurations
- **HealthHistoryEntry** - Crop health assessments and analysis history

### LLM & Analytics
- **LLMRequestLog** - All LLM API calls for monitoring and audit
- **WeatherCache** - Cached weather predictions
- **CropComparison** - Stored crop comparison results
- **PlantingCalendar** - Cached planting calendar data

## Common Commands

### View Database

```bash
npx prisma studio
```

Opens Prisma Studio for graphical database exploration.

### Generate Migrations

After modifying `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name describe_changes
```

### Reset Database (Development Only)

```bash
npx prisma migrate reset
```

## API Endpoints

### App State Management
- `POST /api/app-state/init` - Initialize user app state
- `GET /api/app-state/:userId` - Get app state
- `PUT /api/app-state/:userId` - Update app state

### Locations
- `POST /api/app-state/locations/:userId` - Save location
- `GET /api/app-state/locations/:userId` - Get all locations
- `DELETE /api/app-state/locations/:userId/:name` - Delete location

### API Configurations
- `POST /api/app-state/api-configs/:userId` - Add API provider
- `GET /api/app-state/api-configs/:userId` - Get all configs
- `PUT /api/app-state/api-configs/:userId/:configId` - Update config
- `DELETE /api/app-state/api-configs/:userId/:configId` - Delete config

### LLM Operations (Moved to Server)
- `POST /api/llm/weather-analysis` - Analyze weather
- `POST /api/llm/crop-health` - Analyze crop health
- `POST /api/llm/watering-recommendations` - Generate watering plan
- `POST /api/llm/fertilization` - Generate fertilization plan
- `POST /api/llm/weather-alerts` - Check for alerts
- `POST /api/llm/crop-comparison` - Compare crops
- `POST /api/llm/crop-encyclopedia` - Get crop info

### Health Checks
- `GET /api/health` - Server health
- `GET /api/db-health` - Database connection status

## Troubleshooting

### Connection Refused

```
error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:** Ensure PostgreSQL is running and DATABASE_URL is correct.

### Authentication Failed

```
error: password authentication failed for user "postgres"
```

**Solution:** Update DATABASE_URL with correct credentials.

### Tables Not Found

```
relation "public.User" does not exist
```

**Solution:** Run `npm run db:push` to create tables.

## Production Deployment

1. Set `DATABASE_URL` environment variable on your server
2. Run migrations: `npm run db:migrate`
3. Build app: `npm run build`
4. Start server: `npm run start`

For Vercel/Netlify deployments, add `DATABASE_URL` to environment variables.
