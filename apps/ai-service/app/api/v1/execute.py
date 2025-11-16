"""执行API端点"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse

from app.schemas.execution import (
    ExecutionCreate,
    ExecutionResponse,
    ExecutionStatus,
    ExecutionLog,
)
from app.services import ExecutionService
from app.core import get_logger

logger = get_logger(__name__)

router = APIRouter()

# 全局执行服务实例
_execution_service: Optional[ExecutionService] = None


def get_execution_service() -> ExecutionService:
    """获取执行服务实例（依赖注入）"""
    global _execution_service
    if _execution_service is None:
        _execution_service = ExecutionService()
    return _execution_service


@router.post("/execute", response_model=ExecutionResponse, status_code=202)
async def execute_workflow(
    request: ExecutionCreate,
    service: ExecutionService = Depends(get_execution_service),
) -> ExecutionResponse:
    """执行工作流
    
    触发工作流的异步执行。
    
    Args:
        request: 执行请求
        service: 执行服务
        
    Returns:
        执行初始状态
        
    Raises:
        HTTPException: 执行失败
    """
    try:
        logger.info(
            "execute_workflow_request",
            execution_id=request.execution_id,
            workflow_id=request.workflow_id,
        )

        # 触发异步执行
        result = await service.execute_workflow(
            execution_id=request.execution_id,
            workflow_id=request.workflow_id,
            definition=request.definition,
            input_data=request.input_data,
        )

        logger.info(
            "execute_workflow_started",
            execution_id=request.execution_id,
            status=result["status"],
        )

        return ExecutionResponse(
            id=result["execution_id"],
            workflow_id=result["workflow_id"],
            status=result["status"],
            input_data=result["input_data"],
            output_data=result.get("output_data"),
            error_message=result.get("error_message"),
            started_at=result.get("started_at"),
            completed_at=result.get("completed_at"),
        )

    except Exception as e:
        logger.exception("execute_workflow_error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute workflow: {str(e)}",
        )


@router.get("/execute/{execution_id}/status", response_model=ExecutionStatus)
async def get_execution_status(
    execution_id: str,
    service: ExecutionService = Depends(get_execution_service),
) -> ExecutionStatus:
    """获取执行状态
    
    Args:
        execution_id: 执行ID
        service: 执行服务
        
    Returns:
        执行状态
        
    Raises:
        HTTPException: 执行不存在
    """
    try:
        status = service.get_execution_status(execution_id)
        
        if status is None:
            raise HTTPException(
                status_code=404,
                detail=f"Execution {execution_id} not found",
            )

        return ExecutionStatus(
            execution_id=status["execution_id"],
            status=status["status"],
            current_node=status.get("current_node"),
            progress=status.get("progress", 0.0),
            message=status.get("error_message"),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("get_execution_status_error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get execution status: {str(e)}",
        )


@router.get("/execute/{execution_id}/logs")
async def get_execution_logs(
    execution_id: str,
    level: Optional[str] = Query(None, description="日志级别过滤 (info, warning, error)"),
    limit: Optional[int] = Query(None, description="返回数量限制"),
    service: ExecutionService = Depends(get_execution_service),
) -> JSONResponse:
    """获取执行日志
    
    Args:
        execution_id: 执行ID
        level: 日志级别过滤
        limit: 返回数量限制
        service: 执行服务
        
    Returns:
        日志列表
        
    Raises:
        HTTPException: 获取失败
    """
    try:
        logs = service.get_execution_logs(
            execution_id=execution_id,
            level=level,
            limit=limit,
        )

        return JSONResponse(
            content={
                "execution_id": execution_id,
                "logs": logs,
                "count": len(logs),
            }
        )

    except Exception as e:
        logger.exception("get_execution_logs_error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get execution logs: {str(e)}",
        )


@router.post("/execute/{execution_id}/stop")
async def stop_execution(
    execution_id: str,
    service: ExecutionService = Depends(get_execution_service),
) -> JSONResponse:
    """停止执行
    
    Args:
        execution_id: 执行ID
        service: 执行服务
        
    Returns:
        操作结果
        
    Raises:
        HTTPException: 停止失败
    """
    try:
        logger.info("stop_execution_request", execution_id=execution_id)

        success = await service.stop_execution(execution_id)

        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"Execution {execution_id} not found or cannot be stopped",
            )

        logger.info("stop_execution_success", execution_id=execution_id)

        return JSONResponse(
            content={
                "execution_id": execution_id,
                "status": "stopped",
                "message": "Execution stopped successfully",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("stop_execution_error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stop execution: {str(e)}",
        )


@router.post("/execute/{execution_id}/pause")
async def pause_execution(
    execution_id: str,
    service: ExecutionService = Depends(get_execution_service),
) -> JSONResponse:
    """暂停执行
    
    Args:
        execution_id: 执行ID
        service: 执行服务
        
    Returns:
        操作结果
        
    Raises:
        HTTPException: 暂停失败
    """
    try:
        logger.info("pause_execution_request", execution_id=execution_id)

        success = await service.pause_execution(execution_id)

        if not success:
            raise HTTPException(
                status_code=400,
                detail=f"Execution {execution_id} cannot be paused",
            )

        logger.info("pause_execution_success", execution_id=execution_id)

        return JSONResponse(
            content={
                "execution_id": execution_id,
                "status": "paused",
                "message": "Execution paused successfully",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("pause_execution_error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to pause execution: {str(e)}",
        )


@router.post("/execute/{execution_id}/resume")
async def resume_execution(
    execution_id: str,
    service: ExecutionService = Depends(get_execution_service),
) -> JSONResponse:
    """恢复执行
    
    Args:
        execution_id: 执行ID
        service: 执行服务
        
    Returns:
        操作结果
        
    Raises:
        HTTPException: 恢复失败
    """
    try:
        logger.info("resume_execution_request", execution_id=execution_id)

        success = await service.resume_execution(execution_id)

        if not success:
            raise HTTPException(
                status_code=400,
                detail=f"Execution {execution_id} cannot be resumed",
            )

        logger.info("resume_execution_success", execution_id=execution_id)

        return JSONResponse(
            content={
                "execution_id": execution_id,
                "status": "running",
                "message": "Execution resumed successfully",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("resume_execution_error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to resume execution: {str(e)}",
        )

