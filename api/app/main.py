from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
from uuid import uuid4
import asyncio
from concurrent.futures import ThreadPoolExecutor

from fastapi import BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

from .agent import Agent
from .channel import Channel, ChannelConfig
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

_channels: Dict[str, Channel] = {}
_channel_status: Dict[str, Dict[str, Any]] = {}
_executor = ThreadPoolExecutor(max_workers=4)

class CreateChannelRequest(BaseModel):
    task: str = Field(..., description="Task description presented to the agents.")
    guiding_model: str = Field(..., description="Model identifier for the guiding / moderator agent.")
    participant_models: List[str] = Field(..., min_items=1, description="List of model identifiers for participant agents.")
    max_rounds: int = Field(8, ge=1, le=20, description="Maximum number of discussion rounds.")

class ChannelStatusResponse(BaseModel):
    status: str
    rounds_executed: int
    answer: str | None = None

def _run_channel(channel_id: str) -> None:  
    channel = _channels[channel_id]
    _channel_status[channel_id]["status"] = "running"
    try:
        answer = channel.run()
        _channel_status[channel_id].update(
            {
                "status": "finished",
                "rounds_executed": channel.rounds_executed,
                "answer": answer,
            }
        )
    except Exception as exc:
        _channel_status[channel_id].update({"status": "error", "error": str(exc)})

@app.post("/channels", response_model=dict)
async def create_channel(req: CreateChannelRequest, background_tasks: BackgroundTasks):
    """Spin up a new consensus channel and return its ID."""
    channel_id = str(uuid4())

    guiding_agent = Agent(req.guiding_model)
    participant_agents = [Agent(m) for m in req.participant_models]
    config = ChannelConfig(max_rounds=req.max_rounds)

    channel = Channel(req.task, guiding_agent, participant_agents, config)
    _channels[channel_id] = channel
    _channel_status[channel_id] = {"status": "pending", "rounds_executed": 0, "answer": None}

    loop = asyncio.get_event_loop()
    background_tasks.add_task(loop.run_in_executor, _executor, _run_channel, channel_id)

    return {"channel_id": channel_id}


@app.get("/channels/{channel_id}", response_model=ChannelStatusResponse)
async def get_channel_status(channel_id: str):
    if channel_id not in _channel_status:
        raise HTTPException(status_code=404, detail="Channel not found")
    return _channel_status[channel_id]

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
