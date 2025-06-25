## Getting Started

### Frontend
1. Open a terminal and navigate to the `web` directory:
   ```sh
   cd web
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the development server:
   ```sh
   npm run dev
   ```

### Backend
1. Open a terminal and navigate to the `api` directory:
   ```sh
   cd api
   ```
2. Build and start the backend using Docker Compose:
   ```sh
   docker-compose up --build
   ```
   - Add `-d` to run in detached mode:
     ```sh
     docker-compose up --build -d
     ```

### Deploy Backend to Fly.io
1. Install the [Fly CLI](https://fly.io/docs/getting-started/install-fly-cli/).
2. Login to Fly.io:
   ```sh
   fly auth login
   ```
3. cd into api directory:
   ```sh
   cd api
   ```
4. Set the following environment variables:
   ```sh
   fly secrets set DATABASE_URL="<YOUR DATABASE URL>"
   fly secrets set OPENROUTER_API_KEY="<YOUR OPENROUTER API KEY>"
   ```
5. Deploy to Fly.io:
   ```sh
   fly deploy
   ```
Note: If you use Supabase make sure to include asyncpg in your connection string.

### Deploy Frontend to Cloudflare Pages
1. Go to cloudflare pages site and connect to GitHub Repo. Select React Vite as framework and set the root to /web.