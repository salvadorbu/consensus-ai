"""Tests for api/app/routers/chat_router.py"""

import uuid
from http import HTTPStatus
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app  # Assuming your FastAPI app instance is here
from app.models.chat import Chat
from app.schemas.chat import ChatCreate, ChatRead
from app.db import get_session # To override dependency


@pytest.fixture
def mock_session() -> AsyncMock:
    """Fixture to mock the SQLAlchemy AsyncSession."""
    session = AsyncMock(spec=AsyncSession)
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.execute = AsyncMock()
    session.scalar_one_or_none = AsyncMock()
    session.scalars = MagicMock()
    return session

    
@pytest.fixture
def client(mock_session: AsyncMock) -> TestClient:
    """Fixture to create a TestClient with a mocked DB session."""
    app.dependency_overrides[get_session] = lambda: mock_session
    return TestClient(app)


@pytest.mark.asyncio
async def test_create_chat(client: TestClient, mock_session: AsyncMock):
    """Test creating a new chat room."""
    chat_data = ChatCreate(name="Test Chat", default_model="gpt-3.5-turbo")
    chat_id = uuid.uuid4()
    expected_chat_response = ChatRead(
        id=chat_id,
        name=chat_data.name,
        default_model=chat_data.default_model,
        created_at=MagicMock(),  # Will be set by the DB
        updated_at=MagicMock(),  # Will be set by the DB
    )

    # Configure the mock session to behave as if a chat is created
    async def refresh_side_effect(chat_instance):
        # Simulate the DB setting the ID and timestamps
        chat_instance.id = chat_id
        chat_instance.created_at = expected_chat_response.created_at
        chat_instance.updated_at = expected_chat_response.updated_at

    mock_session.refresh.side_effect = refresh_side_effect

    response = client.post("/chats", json=chat_data.model_dump())

    assert response.status_code == HTTPStatus.CREATED
    response_json = response.json()
    # We can't know the exact timestamps, so compare other fields
    assert response_json["name"] == expected_chat_response.name
    assert response_json["default_model"] == expected_chat_response.default_model
    assert uuid.UUID(response_json["id"]) == chat_id # Ensure id is a valid UUID and matches

    mock_session.add.assert_called_once()
    mock_session.commit.assert_awaited_once()
    mock_session.refresh.assert_awaited_once()

    # Check that the object passed to add is a Chat instance
    added_object = mock_session.add.call_args[0][0]
    assert isinstance(added_object, Chat)
    assert added_object.name == chat_data.name
    assert added_object.default_model == chat_data.default_model
