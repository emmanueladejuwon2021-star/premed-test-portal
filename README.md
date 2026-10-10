# PreMed Test Portal

A full-stack, secure, AI-powered academic CBT (Computer Based Test) portal with a React frontend and a Vercel-ready serverless backend using Hono and MongoDB.

## Features

- **Robust Testing Engine**: Secure environment, countdown timers, intelligent tracking.
- **AI-Powered OCR**: Automatic parsing of PDF and DOCX files to generate interactive question banks.
- **Admin & Developer Dashboards**: Manage courses, students, results, server monitoring, and incidents.
- **MongoDB Database**: Scalable NoSQL cloud database integration.

## Local Development (VS Code)

### Prerequisites

- **Node.js** (v20 or higher recommended)
- **MongoDB Atlas** account (or local MongoDB server)

### Setup

1. **Clone/Download** the project files.
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your details:
   ```bash
   cp .env.example .env
   ```
   **Important Variables**:
   - `MONGODB_URI`: Your MongoDB database connection string. Ensure your IP (or `0.0.0.0/0`) is whitelisted in Atlas.
   - `JWT_SECRET`: A secure random string for signing auth tokens.
   - `EMMANUEL_ADMIN_KEY`: Admin dashboard access key.
   - `DEVELOPER_PASSWORD`: Developer monitoring dashboard password.

4. **Run the application**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## Deployment

This app is optimized for serverless deployment on platforms like Vercel.

### Deploying to Vercel

1. Push your code to a GitHub repository.
2. Import the project in Vercel.
3. Overwrite the `Build Command` to `npm run build` or let Vercel use defaults.
4. Set the **Environment Variables** (MONGODB_URI, JWT_SECRET, etc.) in your Vercel project settings.
5. Deploy. The backend API is automatically routed through Vercel serverless functions via the `api/index.ts` handler and `vercel.json`.

## Project Structure

- `src/app.ts`: Hono backend main entry point.
- `src/db.ts`: MongoDB Mongoose connection handler.
- `src/routes/`: Backend API routes (Admin, Auth, Courses, Simulation, Developer).
- `src/views/`: Frontend React views (Dashboards, Test Active, Login).
- `src/components/`: Reusable React components.
- `api/index.ts`: Vercel serverless function entry script.
- `vercel.json`: Vercel routing configuration.
