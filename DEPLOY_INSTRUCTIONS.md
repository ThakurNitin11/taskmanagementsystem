# Railway Deployment Guide

## Backend Setup

### 1. Railway Variables (Backend Service)
Go to backend service → Variables tab and make sure these exist
(Railway MySQL plugin automatically adds these):

- `MYSQLHOST` - MySQL host (auto from Railway MySQL)
- `MYSQLPORT` - MySQL port (auto from Railway MySQL)  
- `MYSQLDATABASE` - Database name (auto from Railway MySQL)
- `MYSQLUSER` - Username (auto from Railway MySQL)
- `MYSQLPASSWORD` - Password (auto from Railway MySQL)

### 2. Build Command (Backend)
Railway will auto-detect or use railway.json:
```
./mvnw clean package -DskipTests
```

### 3. Start Command (Backend)
Already set in Procfile and railway.json:
```
java -Xmx256m -Xss512k -XX:+UseSerialGC -jar target/*.jar
```

## Frontend Setup

### Railway Variables (Frontend Service)
- `VITE_API_URL` = your backend Railway URL
  Example: `https://artistic-energy-production-dbae.up.railway.app`

### Build Command (Frontend)
```
npm install && npm run build
```

### Start Command (Frontend)
```
npm run preview
```

## What Was Fixed
1. **OOM Crash** - Added JVM memory limits (-Xmx256m) in Procfile + railway.json
2. **CORS Error** - SecurityConfig now allows all origins (allowedOriginPatterns)
3. **Database URL** - Now uses Railway env variables instead of hardcoded localhost
4. **Connection Pool** - Reduced HikariCP pool size to save memory
