from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
