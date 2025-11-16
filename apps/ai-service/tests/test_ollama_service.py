"""测试OllamaService"""

import json
from unittest.mock import AsyncMock, Mock, patch

import httpx
import pytest

from app.services.ollama_service import (
    OllamaConnectionError,
    OllamaModelNotFoundError,
    OllamaService,
    OllamaServiceError,
)


@pytest.fixture
def ollama_service():
    """创建OllamaService实例"""
    return OllamaService(base_url="http://test-ollama:11434", timeout=30.0, max_connections=5)


@pytest.mark.asyncio
async def test_generate_non_stream(ollama_service):
    """测试非流式生成"""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"response": "Hello, world!"}

    with patch.object(ollama_service.client, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        result = await ollama_service.generate(model="llama2", prompt="Say hello", stream=False)

        assert result == "Hello, world!"
        mock_post.assert_called_once()


@pytest.mark.asyncio
async def test_generate_connection_error(ollama_service):
    """测试连接错误"""
    with patch.object(
        ollama_service.client, "post", new_callable=AsyncMock
    ) as mock_post:
        mock_post.side_effect = httpx.ConnectError("Connection failed")

        with pytest.raises(OllamaConnectionError):
            await ollama_service.generate(model="llama2", prompt="test", stream=False)


@pytest.mark.asyncio
async def test_generate_model_not_found(ollama_service):
    """测试模型未找到错误"""
    mock_response = Mock()
    mock_response.status_code = 404

    with patch.object(ollama_service.client, "post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.HTTPStatusError(
            "Not found", request=Mock(), response=mock_response
        )

        with pytest.raises(OllamaModelNotFoundError):
            await ollama_service.generate(model="invalid", prompt="test", stream=False)


@pytest.mark.asyncio
async def test_list_models(ollama_service):
    """测试获取模型列表"""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "models": [
            {"name": "llama2", "size": 3825819519},
            {"name": "mistral", "size": 4109865159},
        ]
    }

    with patch.object(ollama_service.client, "get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response

        models = await ollama_service.list_models()

        assert len(models) == 2
        assert models[0]["name"] == "llama2"
        assert models[1]["name"] == "mistral"


@pytest.mark.asyncio
async def test_show_model(ollama_service):
    """测试获取模型信息"""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "modelfile": "FROM llama2",
        "parameters": "temperature 0.7",
        "template": "{{ .Prompt }}",
    }

    with patch.object(ollama_service.client, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        info = await ollama_service.show_model("llama2")

        assert "modelfile" in info
        assert "parameters" in info
        assert "template" in info


@pytest.mark.asyncio
async def test_health_check_success(ollama_service):
    """测试健康检查成功"""
    mock_response = Mock()
    mock_response.status_code = 200

    with patch.object(ollama_service.client, "get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response

        result = await ollama_service.health_check()

        assert result is True


@pytest.mark.asyncio
async def test_health_check_failure(ollama_service):
    """测试健康检查失败"""
    with patch.object(ollama_service.client, "get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = httpx.ConnectError("Connection failed")

        result = await ollama_service.health_check()

        assert result is False


@pytest.mark.asyncio
async def test_close(ollama_service):
    """测试关闭客户端"""
    with patch.object(ollama_service.client, "aclose", new_callable=AsyncMock) as mock_close:
        await ollama_service.close()
        mock_close.assert_called_once()


@pytest.mark.asyncio
async def test_context_manager():
    """测试异步上下文管理器"""
    async with OllamaService(base_url="http://test:11434") as service:
        assert service is not None
        assert isinstance(service, OllamaService)
