"""API v1版本"""

from fastapi import APIRouter

from app.api.v1 import execute

# 创建v1路由器
api_router = APIRouter()

# 注册子路由
api_router.include_router(execute.router, tags=["Execute"])

# TODO: 添加更多路由
# from app.api.v1 import models
# api_router.include_router(models.router, prefix="/models", tags=["Models"])

__all__ = ["api_router"]
