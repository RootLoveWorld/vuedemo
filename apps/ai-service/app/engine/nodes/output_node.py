"""输出节点执行器"""

from typing import Any, Dict
import logging
import json

from app.engine.nodes.base import NodeExecutor, NodeExecutionError, NodeValidationError
from app.engine.context import ExecutionContext
from app.schemas.node import NodeResult

logger = logging.getLogger(__name__)


class OutputNodeExecutor(NodeExecutor):
    """输出节点执行器
    
    格式化和过滤工作流的输出数据。
    
    配置参数:
    - source_node: 源节点ID（可选）
      如果指定，从该节点获取输出；否则使用最后一个节点的输出
    
    - format: 输出格式（可选）
      - "raw": 原始输出（默认）
      - "json": JSON字符串
      - "text": 纯文本
      - "custom": 自定义格式化
    
    - fields: 要包含的字段列表（可选）
      如果指定，只输出这些字段
    
    - exclude_fields: 要排除的字段列表（可选）
      如果指定，排除这些字段
    
    - template: 输出模板（可选，format为custom时使用）
      支持变量替换，如: "Result: {{output.result}}"
    
    - pretty: 是否美化输出（可选，format为json时使用）
    
    示例配置:
    1. 原始输出:
    {
        "format": "raw"
    }
    
    2. JSON格式化:
    {
        "format": "json",
        "pretty": true
    }
    
    3. 字段过滤:
    {
        "fields": ["result", "status"]
    }
    
    4. 自定义模板:
    {
        "format": "custom",
        "template": "Analysis Result: {{output.analysis}}\nConfidence: {{output.confidence}}"
    }
    """

    VALID_FORMATS = ["raw", "json", "text", "custom"]

    def __init__(self, node_id: str):
        """初始化输出节点执行器
        
        Args:
            node_id: 节点ID
        """
        super().__init__(node_id, "output")

    def validate_config(self, config: Dict[str, Any]) -> bool:
        """验证节点配置
        
        Args:
            config: 节点配置
            
        Returns:
            bool: 配置是否有效
            
        Raises:
            NodeValidationError: 验证错误
        """
        # 验证format
        if "format" in config:
            format_type = config["format"]
            if format_type not in self.VALID_FORMATS:
                raise NodeValidationError(
                    f"Invalid format: {format_type}. "
                    f"Valid formats: {', '.join(self.VALID_FORMATS)}"
                )
            
            # 如果是custom格式，必须提供template
            if format_type == "custom" and "template" not in config:
                raise NodeValidationError("custom format requires 'template' field")
        
        # 验证fields
        if "fields" in config:
            fields = config["fields"]
            if not isinstance(fields, list):
                raise NodeValidationError("fields must be a list")
        
        # 验证exclude_fields
        if "exclude_fields" in config:
            exclude_fields = config["exclude_fields"]
            if not isinstance(exclude_fields, list):
                raise NodeValidationError("exclude_fields must be a list")
        
        # 验证template
        if "template" in config:
            template = config["template"]
            if not isinstance(template, str):
                raise NodeValidationError("template must be a string")
        
        # 验证pretty
        if "pretty" in config:
            if not isinstance(config["pretty"], bool):
                raise NodeValidationError("pretty must be a boolean")
        
        return True

    async def execute(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> NodeResult:
        """执行输出节点
        
        Args:
            node_config: 节点配置
            context: 执行上下文
            
        Returns:
            NodeResult: 节点执行结果
            
        Raises:
            NodeExecutionError: 执行错误
        """
        try:
            # 获取输入数据
            source_node = node_config.get("source_node")
            if source_node:
                input_data = context.get_node_output(source_node)
                self.log_info(
                    f"Getting output from source node: {source_node}",
                    context
                )
            else:
                # 使用上下文中的最后一个节点输出
                input_data = self._get_last_node_output(context)
                self.log_info(
                    "Using last node output",
                    context
                )
            
            if input_data is None:
                self.log_warning("No input data available", context)
                input_data = {}
            
            # 过滤字段
            filtered_data = self._filter_fields(input_data, node_config, context)
            
            # 格式化输出
            format_type = node_config.get("format", "raw")
            output = self._format_output(filtered_data, format_type, node_config, context)
            
            self.log_info(
                f"Output formatted as {format_type}, type: {type(output).__name__}",
                context
            )
            
            return NodeResult(
                node_id=self.node_id,
                status="success",
                output=output,
            )
            
        except NodeExecutionError:
            raise
        except Exception as e:
            error_msg = f"Unexpected error in output node: {str(e)}"
            self.log_error(error_msg, context)
            raise NodeExecutionError(error_msg) from e

    def _get_last_node_output(self, context: ExecutionContext) -> Any:
        """获取最后一个节点的输出
        
        Args:
            context: 执行上下文
            
        Returns:
            最后一个节点的输出
        """
        # 获取所有节点输出
        if not context.node_outputs:
            return None
        
        # 返回最后一个节点的输出
        # 注意：这假设node_outputs是有序的（Python 3.7+字典保持插入顺序）
        last_node_id = list(context.node_outputs.keys())[-1]
        return context.node_outputs[last_node_id]

    def _filter_fields(
        self,
        data: Any,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> Any:
        """过滤字段
        
        Args:
            data: 输入数据
            node_config: 节点配置
            context: 执行上下文
            
        Returns:
            过滤后的数据
        """
        # 如果不是字典，无法过滤字段
        if not isinstance(data, dict):
            return data
        
        # 包含特定字段
        if "fields" in node_config:
            fields = node_config["fields"]
            filtered = {k: v for k, v in data.items() if k in fields}
            
            self.log_info(
                f"Included {len(filtered)} fields: {', '.join(filtered.keys())}",
                context
            )
            
            return filtered
        
        # 排除特定字段
        if "exclude_fields" in node_config:
            exclude_fields = node_config["exclude_fields"]
            filtered = {k: v for k, v in data.items() if k not in exclude_fields}
            
            self.log_info(
                f"Excluded {len(exclude_fields)} fields, remaining: {len(filtered)}",
                context
            )
            
            return filtered
        
        # 没有过滤配置，返回原始数据
        return data

    def _format_output(
        self,
        data: Any,
        format_type: str,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> Any:
        """格式化输出
        
        Args:
            data: 数据
            format_type: 格式类型
            node_config: 节点配置
            context: 执行上下文
            
        Returns:
            格式化后的输出
        """
        if format_type == "raw":
            return data
        
        elif format_type == "json":
            # JSON格式化
            pretty = node_config.get("pretty", False)
            
            try:
                if pretty:
                    return json.dumps(data, indent=2, ensure_ascii=False)
                else:
                    return json.dumps(data, ensure_ascii=False)
            except Exception as e:
                self.log_warning(
                    f"Failed to serialize to JSON: {str(e)}. Returning raw data.",
                    context
                )
                return data
        
        elif format_type == "text":
            # 纯文本格式化
            if isinstance(data, str):
                return data
            elif isinstance(data, dict):
                # 将字典转换为键值对文本
                lines = [f"{k}: {v}" for k, v in data.items()]
                return "\n".join(lines)
            else:
                return str(data)
        
        elif format_type == "custom":
            # 自定义模板格式化
            template = node_config.get("template", "")
            
            # 创建临时上下文用于变量解析
            temp_context = ExecutionContext(
                execution_id=context.execution_id,
                workflow_id=context.workflow_id,
                input_data=context.input_data,
            )
            
            # 将输出数据设置为变量
            temp_context.set_variable("output", data)
            
            # 解析模板
            result = temp_context.resolve_variables(template)
            
            return result
        
        else:
            self.log_warning(
                f"Unknown format type: {format_type}. Returning raw data.",
                context
            )
            return data
