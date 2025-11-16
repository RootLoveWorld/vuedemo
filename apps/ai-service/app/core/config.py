"""应用配置管理"""

from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # 应用配置
    app_name: str = Field(default="AI Workflow Service", alias="APP_NAME")
    app_version: str = Field(default="0.1.0", alias="APP_VERSION")
    debug: bool = Field(default=False, alias="DEBUG")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # 服务配置
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")

    # Ollama配置
    ollama_base_url: str = Field(default="http://localhost:11434", alias="OLLAMA_BASE_URL")
    ollama_default_model: str = Field(default="llama2", alias="OLLAMA_DEFAULT_MODEL")
    ollama_timeout: float = Field(default=300.0, alias="OLLAMA_TIMEOUT")
    ollama_max_connections: int = Field(default=5, alias="OLLAMA_MAX_CONNECTIONS")

    # Redis配置 (可选)
    redis_url: Optional[str] = Field(default=None, alias="REDIS_URL")

    # BFF回调配置
    bff_base_url: str = Field(default="http://localhost:3001", alias="BFF_BASE_URL")
    bff_callback_enabled: bool = Field(default=True, alias="BFF_CALLBACK_ENABLED")

    @property
    def cors_origins(self) -> list[str]:
        """CORS允许的源"""
        if self.debug:
            return ["*"]
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            self.bff_base_url,
        ]


@lru_cache
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()
