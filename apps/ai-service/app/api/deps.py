"""API依赖注入"""

from typing import Annotated

from fastapi import Depends

from app.core import Settings, get_settings

# 配置依赖
SettingsDep = Annotated[Settings, Depends(get_settings)]
