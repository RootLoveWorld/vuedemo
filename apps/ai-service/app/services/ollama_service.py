"""Ollama服务客户端"""

import json
import logging
from typing import Any, AsyncIterator, Optional

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class OllamaServiceError(Exception):
    """Ollama服务错误基类"""

    pass


class OllamaConnectionError(OllamaServiceError):
    """Ollama连接错误"""

    pass


class OllamaModelNotFoundError(OllamaServiceError):
    """模型未找到错误"""

    pass


class OllamaService:
    """Ollama服务客户端

    提供与Ollama本地大模型服务的交互功能，包括：
    - 模型调用（流式和批量）
    - 连接池管理
    - 超时控制
    - 错误重试
    - 模型管理
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        max_connections: Optional[int] = None,
    ):
        """初始化Ollama服务客户端

        Args:
            base_url: Ollama服务地址，默认从配置读取
            timeout: 请求超时时间（秒），默认从配置读取
            max_connections: 最大连接数，默认从配置读取
        """
        settings = get_settings()

        self.base_url = base_url or settings.ollama_base_url
        self.timeout = timeout or settings.ollama_timeout
        self.max_connections = max_connections or settings.ollama_max_connections

        # 配置连接池和超时
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(
                timeout=self.timeout,
                connect=10.0,  # 连接超时10秒
                read=self.timeout,  # 读取超时使用配置值
                write=30.0,  # 写入超时30秒
            ),
            limits=httpx.Limits(
                max_keepalive_connections=self.max_connections,
                max_connections=self.max_connections * 2,
                keepalive_expiry=30.0,  # 保持连接30秒
            ),
            follow_redirects=True,
        )

        logger.info(
            f"OllamaService initialized: base_url={self.base_url}, "
            f"timeout={self.timeout}s, max_connections={self.max_connections}"
        )

    @retry(
        retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True,
    )
    async def generate(
        self,
        model: str,
        prompt: str,
        stream: bool = False,
        **kwargs: Any,
    ) -> str | AsyncIterator[str]:
        """调用Ollama生成接口

        Args:
            model: 模型名称（如 llama2, mistral, codellama 等）
            prompt: 提示词
            stream: 是否使用流式响应
            **kwargs: 其他参数（temperature, top_p, top_k 等）

        Returns:
            str: 非流式响应时返回完整文本
            AsyncIterator[str]: 流式响应时返回异步迭代器

        Raises:
            OllamaConnectionError: 连接失败
            OllamaModelNotFoundError: 模型未找到
            OllamaServiceError: 其他服务错误
        """
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": stream,
            **kwargs,
        }

        try:
            if stream:
                return self._stream_generate(url, payload)
            else:
                response = await self.client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                return data.get("response", "")

        except httpx.ConnectError as e:
            logger.error(f"Failed to connect to Ollama service: {e}")
            raise OllamaConnectionError(
                f"Cannot connect to Ollama at {self.base_url}"
            ) from e
        except httpx.TimeoutException as e:
            logger.error(f"Ollama request timeout: {e}")
            raise OllamaServiceError(f"Request timeout after {self.timeout}s") from e
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.error(f"Model not found: {model}")
                raise OllamaModelNotFoundError(f"Model '{model}' not found") from e
            logger.error(f"Ollama HTTP error: {e}")
            raise OllamaServiceError(f"HTTP error: {e.response.status_code}") from e
        except Exception as e:
            logger.error(f"Unexpected error calling Ollama: {e}")
            raise OllamaServiceError(f"Unexpected error: {str(e)}") from e

    async def _stream_generate(
        self, url: str, payload: dict[str, Any]
    ) -> AsyncIterator[str]:
        """流式生成响应

        Args:
            url: API端点URL
            payload: 请求负载

        Yields:
            str: 生成的文本片段
        """
        try:
            async with self.client.stream("POST", url, json=payload) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            if "response" in data:
                                yield data["response"]
                            # 检查是否完成
                            if data.get("done", False):
                                break
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse JSON line: {line}")
                            continue

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise OllamaModelNotFoundError(
                    f"Model '{payload.get('model')}' not found"
                ) from e
            raise OllamaServiceError(f"HTTP error: {e.response.status_code}") from e
        except Exception as e:
            logger.error(f"Error in stream generation: {e}")
            raise OllamaServiceError(f"Stream error: {str(e)}") from e

    @retry(
        retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True,
    )
    async def list_models(self) -> list[dict[str, Any]]:
        """获取可用模型列表

        Returns:
            list[dict]: 模型信息列表，每个模型包含 name, size, modified_at 等字段

        Raises:
            OllamaConnectionError: 连接失败
            OllamaServiceError: 其他服务错误
        """
        url = f"{self.base_url}/api/tags"

        try:
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()
            models = data.get("models", [])

            logger.info(f"Retrieved {len(models)} models from Ollama")
            return models

        except httpx.ConnectError as e:
            logger.error(f"Failed to connect to Ollama service: {e}")
            raise OllamaConnectionError(
                f"Cannot connect to Ollama at {self.base_url}"
            ) from e
        except httpx.TimeoutException as e:
            logger.error(f"Ollama request timeout: {e}")
            raise OllamaServiceError(f"Request timeout after {self.timeout}s") from e
        except Exception as e:
            logger.error(f"Error listing models: {e}")
            raise OllamaServiceError(f"Failed to list models: {str(e)}") from e

    @retry(
        retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True,
    )
    async def show_model(self, model: str) -> dict[str, Any]:
        """获取模型详细信息

        Args:
            model: 模型名称

        Returns:
            dict: 模型详细信息，包含 modelfile, parameters, template 等

        Raises:
            OllamaModelNotFoundError: 模型未找到
            OllamaConnectionError: 连接失败
            OllamaServiceError: 其他服务错误
        """
        url = f"{self.base_url}/api/show"
        payload = {"name": model}

        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

            logger.info(f"Retrieved info for model: {model}")
            return data

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.error(f"Model not found: {model}")
                raise OllamaModelNotFoundError(f"Model '{model}' not found") from e
            raise OllamaServiceError(f"HTTP error: {e.response.status_code}") from e
        except httpx.ConnectError as e:
            logger.error(f"Failed to connect to Ollama service: {e}")
            raise OllamaConnectionError(
                f"Cannot connect to Ollama at {self.base_url}"
            ) from e
        except Exception as e:
            logger.error(f"Error showing model info: {e}")
            raise OllamaServiceError(f"Failed to get model info: {str(e)}") from e

    @retry(
        retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
        stop=stop_after_attempt(2),  # 拉取模型只重试2次
        wait=wait_exponential(multiplier=1, min=2, max=20),
        reraise=True,
    )
    async def pull_model(self, model: str) -> AsyncIterator[dict[str, Any]]:
        """拉取新模型

        Args:
            model: 模型名称

        Yields:
            dict: 拉取进度信息，包含 status, digest, total, completed 等字段

        Raises:
            OllamaConnectionError: 连接失败
            OllamaServiceError: 其他服务错误
        """
        url = f"{self.base_url}/api/pull"
        payload = {"name": model, "stream": True}

        try:
            logger.info(f"Starting to pull model: {model}")

            async with self.client.stream("POST", url, json=payload, timeout=None) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            yield data

                            # 记录完成状态
                            if data.get("status") == "success":
                                logger.info(f"Successfully pulled model: {model}")
                                break

                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse JSON line: {line}")
                            continue

        except httpx.ConnectError as e:
            logger.error(f"Failed to connect to Ollama service: {e}")
            raise OllamaConnectionError(
                f"Cannot connect to Ollama at {self.base_url}"
            ) from e
        except Exception as e:
            logger.error(f"Error pulling model: {e}")
            raise OllamaServiceError(f"Failed to pull model: {str(e)}") from e

    async def health_check(self) -> bool:
        """健康检查

        Returns:
            bool: 服务是否健康
        """
        try:
            response = await self.client.get(f"{self.base_url}/")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False

    async def close(self) -> None:
        """关闭客户端连接"""
        await self.client.aclose()
        logger.info("OllamaService client closed")

    async def __aenter__(self) -> "OllamaService":
        """异步上下文管理器入口"""
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """异步上下文管理器退出"""
        await self.close()
