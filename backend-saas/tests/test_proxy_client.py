import pytest
from unittest.mock import AsyncMock, Mock, patch
from app.lib.proxy_client import ProxyClient

@pytest.mark.asyncio
async def test_proxy_forward_success():
    # Arrange
    client = ProxyClient("http://backend-agents:8001")
    mock_response = {"status": "ok", "data": "test"}

    # Create a mock response object with sync methods
    mock_http_response = Mock()
    mock_http_response.json.return_value = mock_response
    mock_http_response.raise_for_status = Mock()

    with patch("httpx.AsyncClient.request", new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_http_response

        # Act
        result = await client.forward("POST", "/agent/execute", json={"query": "test"})

        # Assert
        assert result == mock_response
        mock_request.assert_called_once()
