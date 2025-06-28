from fastapi import FastAPI

# Configure application-wide logging before any other local imports
from .logging_config import setup_logging
setup_logging()
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

# Routers
from .routers import init_app as init_routers

app = FastAPI(
    title="Consensus Service",
    description="A service where LLMs collaborate to reach consensus on tasks",
    version="0.1.0"
)

# ---------------------------------------------------------------------------
# Register modular routers (e.g., Chat API)
# ---------------------------------------------------------------------------
init_routers(app)

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

app.add_middleware(
    CORSMiddleware,
    # CORS: specify allowed origins – wildcard not allowed when allow_credentials=True
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://consensus-ai.pages.dev",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "Welcome to the Consensus Service API",
        "docs": "/docs",
        "version": "0.1.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
