"""FastAPI应用入口"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core import get_logger, get_settings, setup_logging

# 设置日志
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """应用生命周期管理"""
    settings = get_settings()
    logger.info(
        "starting_application",
        app_name=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
    )

    # 启动时的初始化逻辑
    # TODO: 初始化数据库连接、Redis连接等

    yield

    # 关闭时的清理逻辑
    logger.info("shutting_down_application")
    # TODO: 关闭数据库连接、Redis连接等


def create_app() -> FastAPI:
    """创建FastAPI应用实例"""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="AI工作流执行服务，基于LangGraph实现",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # 配置CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 注册路由
    from app.api.v1 import api_router
    app.include_router(api_router, prefix="/api/v1")

    # 健康检查端点
    @app.get("/health", tags=["Health"])
    async def health_check() -> JSONResponse:
        """健康检查端点"""
        return JSONResponse(
            content={
                "status": "healthy",
                "app": settings.app_name,
                "version": settings.app_version,
            }
        )

    # 根路径
    @app.get("/", tags=["Root"])
    async def root() -> JSONResponse:
        """根路径"""
        return JSONResponse(
            content={
                "message": f"Welcome to {settings.app_name}",
                "version": settings.app_version,
                "docs": "/docs",
            }
        )

    logger.info(
        "application_created",
        cors_origins=settings.cors_origins,
    )

    return app


# 创建应用实例
app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
