# Full-Stack Setup Instructions

## Quick Start (Docker)

### 1. Start Database
```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- PgAdmin (port 5050)

### 2. Set Up Application

```bash
# Install dependencies
npm install

# Create database schema
npm run db:push

# Seed with sample data
npm run db:seed

# Start development server
npm run dev
```

### 3. Access Application
- App: http://localhost:3000
- PgAdmin: http://localhost:5050 (admin@admin.com / admin)

## Manual Setup (Without Docker)

### 1. Install PostgreSQL

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Install with pgAdmin
- Note the password you set for postgres user

**Mac:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Linux (Ubuntu):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo service postgresql start
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# In psql:
CREATE DATABASE aifce_db;
\q
```

### 3. Configure Application

```bash
# Copy env template
cp .env.example .env

# Edit .env with your database URL
# DATABASE_URL="postgresql://postgres:your_password@localhost:5432/aifce_db"
```

### 4. Initialize Application

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

## Verification

### Check Database Connection
```bash
curl http://localhost:3000/api/db-health
```

Expected response:
```json
{
  "status": "connected",
  "message": "Database is healthy"
}
```

### Check Server Health
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "serverTime": "2024-..."
}
```

## Project Structure

```
AIFCE/
├── prisma/
│   └── schema.prisma          # Database schema
├── server/
│   ├── db.ts                  # Database connection
│   ├── llmService.ts          # LLM operations (server-side)
│   └── routes/
│       ├── appStateRoutes.ts  # State management endpoints
│       └── llmRoutes.ts       # LLM API endpoints
├── services/
│   ├── backendAPI.ts          # Client API service
│   ├── geminiService.ts       # Client-side Gemini (deprecated)
│   └── sensorService.ts
├── components/
│   ├── ApiSettings.tsx
│   ├── WeatherPrediction.tsx
│   ├── CropEncyclopedia.tsx
│   └── ... (other components)
├── contexts/
│   └── AppContext.tsx         # App state management
├── scripts/
│   └── seed.ts                # Database seeding
├── App.tsx                    # Main app component
├── server.ts                  # Express server
├── package.json
├── .env                       # Configuration (create from .env.example)
├── .env.example               # Environment template
├── DATABASE_SETUP.md          # Database documentation
├── MIGRATION_GUIDE.md         # Migration from client to server
├── DEPLOYMENT.md              # Production deployment
└── docker-compose.yml         # Docker configuration
```

## Development Workflow

### 1. Start Services
```bash
# Terminal 1: Database
docker-compose up

# Terminal 2: Dev Server
npm run dev
```

### 2. Browse Database
```bash
npx prisma studio
```

Opens UI at http://localhost:5555

### 3. Make Schema Changes

Edit `prisma/schema.prisma`, then:
```bash
npx prisma migrate dev --name describe_change
```

### 4. View Logs
- Server logs: Terminal running `npm run dev`
- Database logs: Docker logs with `docker logs aifce-postgres`
- API calls: Browser DevTools Network tab

## Common Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build production bundle
npm run start            # Start production server

# Database
npm run db:push          # Apply schema changes
npm run db:migrate       # Create migrations
npm run db:seed          # Seed sample data
npx prisma studio       # Open database UI

# Utilities
npm install              # Install dependencies
npm test                 # Run tests (if configured)
```

## Environment Variables

Create `.env` file:

```bash
# API Keys
GEMINI_API_KEY="your-api-key-here"

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aifce_db"

# Environment
NODE_ENV="development"
```

Get GEMINI_API_KEY from: https://ai.google.dev/

## API Examples

### Initialize User
```bash
curl -X POST http://localhost:3000/api/app-state/init \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

### Analyze Weather
```bash
curl -X POST http://localhost:3000/api/llm/weather-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "location": "New York",
    "weatherData": "Sunny, 75°F",
    "userId": "user-id-here"
  }'
```

### Compare Crops
```bash
curl -X POST http://localhost:3000/api/llm/crop-comparison \
  -H "Content-Type: application/json" \
  -d '{
    "crops": ["tomato", "pepper"],
    "userId": "user-id-here"
  }'
```

## Troubleshooting

### "Error: connect ECONNREFUSED"
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Run: `docker-compose ps` (if using Docker)

### "GEMINI_API_KEY not set"
- Add API key to .env
- Restart dev server

### "Tables not found"
- Run: `npm run db:push`
- Check database name in DATABASE_URL

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port by editing server.ts
```

### Docker issues
```bash
# View logs
docker-compose logs

# Reset containers
docker-compose down -v
docker-compose up
```

## Performance Tips

1. **Database Indexing**: Already configured in schema
2. **API Caching**: Weather and calendar data cached
3. **Pagination**: Use limit parameter for large queries
4. **Connection Pooling**: Enabled by default with Prisma
5. **Compression**: Add to production deployment

## Security Checklist

- [ ] API keys in .env (never commit)
- [ ] Database password is strong
- [ ] CORS configured appropriately
- [ ] Input validation on all routes
- [ ] Rate limiting in production
- [ ] HTTPS enabled on production
- [ ] Database backups scheduled
- [ ] Sensitive data encrypted

## Next Steps

1. Deploy to production (see DEPLOYMENT.md)
2. Set up monitoring and alerting
3. Configure backups
4. Add authentication
5. Implement caching layer
6. Add error tracking

## Support

- Prisma: https://www.prisma.io/docs/
- Express: https://expressjs.com/
- PostgreSQL: https://www.postgresql.org/docs/
- Gemini API: https://ai.google.dev/docs
