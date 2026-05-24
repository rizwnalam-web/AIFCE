# Deployment & Operations Checklist

## Pre-Deployment Checklist

### Development Complete
- [ ] All components updated to use backendAPI
- [ ] All localStorage references removed
- [ ] Database schema matches requirements
- [ ] All API endpoints tested locally
- [ ] Error handling implemented
- [ ] Loading states added to UI
- [ ] Environment variables properly configured

### Database
- [ ] PostgreSQL instance created
- [ ] Database migrations tested
- [ ] Seed data verified
- [ ] Backup strategy planned
- [ ] Connection pooling configured

### Testing
- [ ] Manual testing of all features
- [ ] API endpoints tested with curl
- [ ] Database queries verified
- [ ] Error scenarios tested
- [ ] Performance acceptable

## Local Development Verification

### 1. Verify Services Running
```bash
# Check database
curl http://localhost:3000/api/db-health

# Check server
curl http://localhost:3000/api/health

# Check app (Vite Dev Server) starts at http://localhost:5173
# If backend is on 3000, ensure vite.config.ts has a proxy for /api
```

### 2. Test Core Functionality
```bash
# Initialize user
curl -X POST http://localhost:3000/api/app-state/init \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test LLM
curl -X POST http://localhost:3000/api/llm/crop-encyclopedia \
  -H "Content-Type: application/json" \
  -d '{"cropName":"tomato"}'
```

### 3. Browser Testing
- [ ] Create account/initialize
- [ ] Add locations
- [ ] Add API provider
- [ ] Test each feature
- [ ] Verify data persists (refresh page)
- [ ] Check browser console for errors

## Production Deployment

### Database Setup

#### Option 1: Railway
```bash
# Create PostgreSQL on railway.app
# Copy connection string to .env
# Run migrations: npm run db:push
```

#### Option 2: AWS RDS
```bash
# Create RDS PostgreSQL instance
# Update security groups to allow connections
# Update DATABASE_URL
# Run migrations
```

#### Option 3: DigitalOcean
```bash
# Create managed PostgreSQL database
# Update DATABASE_URL
# Run migrations
```

#### Option 4: Azure Database for PostgreSQL
```bash
# Create managed PostgreSQL
# Update DATABASE_URL
# Run migrations
```

### Application Deployment

#### Option 1: Vercel
```bash
# Connect GitHub repo
# Add environment variables:
#   - GEMINI_API_KEY
#   - DATABASE_URL
# Deploy
```

#### Option 2: Netlify
```bash
# Connect GitHub repo
# Set build command: npm run build
# Set publish directory: dist
# Add environment variables
# Deploy
```

#### Option 3: Heroku
```bash
heroku login
heroku create your-app-name
heroku addons:create heroku-postgresql:standard-0

# Set environment variables
heroku config:set GEMINI_API_KEY=your-key
heroku config:set DATABASE_URL=...

git push heroku main
```

#### Option 4: Self-Hosted (VPS)
```bash
# On your server:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql

# Clone your app
git clone your-repo
cd your-repo
npm install
npm run build

# Set environment variables
export GEMINI_API_KEY=...
export DATABASE_URL=...

# Run migrations
npm run db:push

# Start server
npm run start
```

## Post-Deployment

### 1. Health Checks
```bash
curl https://your-domain.com/api/health
curl https://your-domain.com/api/db-health
```

### 2. Monitoring Setup

#### Error Tracking
```bash
# Install Sentry (example)
npm install @sentry/node

# Add to server.ts:
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: "your-sentry-dsn" });
```

#### Performance Monitoring
```bash
# Use built-in LLM request logs
# Monitor at: /api/app-state/analytics (add endpoint)
```

#### Log Aggregation
```bash
# Use platform logs (Vercel, Heroku, etc.)
# Or setup ELK stack for self-hosted
```

### 3. Database Backups

#### Automated Backups
```bash
# Railway: Automatic daily backups
# Heroku: Automatic daily backups  
# AWS RDS: Configure backup retention
# DigitalOcean: Configure backup policy
```

#### Manual Backups
```bash
# Export database
pg_dump -U postgres aifce_db > backup-$(date +%s).sql

# Import database
psql -U postgres aifce_db < backup.sql
```

## Ongoing Operations

### Weekly Tasks
- [ ] Check error logs
- [ ] Review LLM request patterns
- [ ] Monitor API response times
- [ ] Check database disk usage
- [ ] Verify backups completed

### Monthly Tasks
- [ ] Review and analyze metrics
- [ ] Check for security updates
- [ ] Update dependencies: `npm update`
- [ ] Review database performance
- [ ] Test backup restoration
- [ ] Review API usage costs

### Quarterly Tasks
- [ ] Database optimization (VACUUM, ANALYZE)
- [ ] Security audit
- [ ] Performance optimization
- [ ] Dependency updates: `npm upgrade`
- [ ] Review and update documentation

## Scaling Guidelines

### When to Scale Database
- Query times > 100ms average
- Connection pool warnings
- Disk usage > 80%
- CPU > 70% sustained

**Scale by:**
- Upgrading instance size
- Adding read replicas
- Implementing caching layer (Redis)
- Optimizing slow queries

### When to Scale Server
- Response times > 500ms
- Error rates > 0.1%
- Memory usage > 80%
- CPU > 70% sustained

**Scale by:**
- Increasing instance size
- Adding load balancer
- Running multiple instances
- Caching frequently-used data

## Security Hardening

### Environment Variables
- [ ] Never commit .env
- [ ] Use strong database passwords
- [ ] Rotate API keys regularly
- [ ] Use secrets manager for production

### Database
- [ ] Enable SSL connections
- [ ] Restrict network access
- [ ] Enable query logging
- [ ] Regular security updates
- [ ] Encrypted backups

### Application
- [ ] Enable HTTPS/TLS
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak info
- [ ] Security headers configured

### Monitoring
- [ ] Failed login attempts logged
- [ ] API abuse detected
- [ ] Database access logged
- [ ] Suspicious queries blocked

## Disaster Recovery

### RTO (Recovery Time Objective)
- Target: 1 hour to restore service

### RPO (Recovery Point Objective)  
- Target: 1 hour of data loss maximum

### Recovery Procedures

**Database Corruption:**
```bash
# Restore from backup
psql production_db < latest_backup.sql
```

**Application Error:**
```bash
# Revert to previous version
git revert last-commit
npm run build
npm run start
```

**Data Loss:**
```bash
# Use point-in-time recovery
# Contact database provider for PITR
```

## Cost Optimization

### Database
- Use managed services (cheaper than self-hosted)
- Optimize queries to reduce load
- Archive old data
- Use appropriate instance size

### Server
- Use serverless/functions where possible
- CDN for static assets
- Compression enabled
- Caching layer for hot data

### LLM API
- Implement request caching
- Batch requests where possible
- Monitor usage vs costs
- Consider cheaper models for non-critical calls

## Documentation Updates

After deployment, update:
- [ ] API documentation with live URL
- [ ] Environment setup guide
- [ ] Deployment procedures
- [ ] Monitoring dashboards
- [ ] Troubleshooting guide
- [ ] Team runbook

## Team Onboarding

Create runbook for team:
- [ ] Getting started locally
- [ ] Common dev commands
- [ ] Debugging procedures
- [ ] Deployment process
- [ ] Emergency contacts
- [ ] Escalation procedures

## Success Metrics

Track these metrics:
- API response time (target: <100ms)
- Error rate (target: <0.01%)
- Database query time (target: <50ms)
- User uptime (target: 99.9%)
- LLM API costs (track monthly)

## Support & Maintenance

### SLA (Service Level Agreement)
```
Production Issues: Respond within 1 hour
Feature Requests: Review within 1 week
Security Issues: Respond within 1 hour
```

### Escalation Path
1. Team member discovers issue
2. Create incident ticket
3. Page on-call engineer if P1
4. Update status page
5. Post-incident review

## Final Checklist Before Go-Live

- [ ] All code reviewed
- [ ] All tests passing
- [ ] Database backups tested
- [ ] Monitoring configured
- [ ] Alerting configured
- [ ] Documentation complete
- [ ] Team trained
- [ ] Rollback plan ready
- [ ] Customer notification ready
- [ ] Support team ready

---

**Deployment Date:** _______________

**Deployed By:** _______________

**Production URL:** _______________

**Monitoring Dashboard:** _______________

**On-Call Contact:** _______________

Good luck with your deployment! 🚀
