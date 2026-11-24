# ---------- Stage 1: build the React frontend ----------
FROM node:20-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
# Render passes env vars as build args; Vite bakes this key into the bundle
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
# vite.config.js outputs to backend/src/main/resources/static
RUN npm run build

# ---------- Stage 2: build the Spring Boot jar ----------
FROM maven:3.9-eclipse-temurin-17 AS backend
WORKDIR /app/backend
COPY backend/pom.xml ./
RUN mvn -q -B dependency:go-offline
COPY backend/src ./src
COPY --from=frontend /app/backend/src/main/resources/static ./src/main/resources/static
RUN mvn -q -B -DskipTests package

# ---------- Stage 3: runtime (JDK + Node + Python + g++ for code execution) ----------
FROM eclipse-temurin:17-jdk
RUN apt-get update \
 && apt-get install -y --no-install-recommends g++ python3 \
 && rm -rf /var/lib/apt/lists/*
# Node + npm/npx from the official image (used for JS and TypeScript execution)
COPY --from=node:20-slim /usr/local/ /usr/local/
RUN npm install -g tsx

# Run as a non-root user, since the app executes user-submitted code
RUN useradd -m app
USER app
WORKDIR /home/app
COPY --from=backend /app/backend/target/dsa-insights-backend-0.1.0.jar app.jar

# Keep memory low for Render's 512 MB free plan
ENV JAVA_TOOL_OPTIONS="-Xmx300m -XX:+UseSerialGC"
EXPOSE 3001
# Render sets PORT; the --server.port flag above makes Spring Boot use it
CMD ["sh", "-c", "java -jar app.jar --server.port=${PORT:-3001}"]
