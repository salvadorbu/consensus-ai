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
