"""转换节点执行器"""

from typing import Any, Dict
import logging
import json
import re

from app.engine.nodes.base import NodeExecutor, NodeExecutionError, NodeValidationError
from app.engine.context import ExecutionContext
from app.schemas.node import NodeResult

logger = logging.getLogger(__name__)


class TransformNodeExecutor(NodeExecutor):
    """转换节点执行器
    
    对数据进行转换和映射操作。
    
    配置参数:
    - transform_type: 转换类型（必需）
      - "mapping": 字段映射
      - "filter": 字段过滤
      - "merge": 合并多个输入
      - "extract": 提取特定字段
      - "custom": 自定义转换（使用表达式）
    
    - mappings: 字段映射配置（transform_type为mapping时必需）
      格式: {"output_field": "{{input.source_field}}"}
    
    - fields: 字段列表（transform_type为filter或extract时必需）
    
    - sources: 源节点列表（transform_type为merge时必需）
    
    - expression: 自定义表达式（transform_type为custom时必需）
      支持简单的Python表达式，可访问input变量
    
    示例配置:
    1. 字段映射:
    {
        "transform_type": "mapping",
        "mappings": {
            "user_name": "{{input.name}}",
            "user_age": "{{input.age}}",
            "full_info": "Name: {{input.name}}, Age: {{input.age}}"
        }
    }
    
    2. 字段过滤:
    {
        "transform_type": "filter",
        "fields": ["name", "email"]
    }
    
    3. 合并:
    {
        "transform_type": "merge",
        "sources": ["node1", "node2"]
    }
    """

    TRANSFORM_TYPES = ["mapping", "filter", "merge", "extract", "custom"]

    def __init__(self, node_id: str):
        """初始化转换节点执行器
        
        Args:
            node_id: 节点ID
        """
        super().__init__(node_id, "transform")

    def validate_config(self, config: Dict[str, Any]) -> bool:
        """验证节点配置
        
        Args:
            config: 节点配置
            
        Returns:
            bool: 配置是否有效
            
        Raises:
            NodeValidationError: 验证错误
        """
        # 检查必需字段
        if "transform_type" not in config:
            raise NodeValidationError("Missing required field: transform_type")
        
        transform_type = config["transform_type"]
        
        # 验证转换类型
        if transform_type not in self.TRANSFORM_TYPES:
            raise NodeValidationError(
                f"Invalid transform_type: {transform_type}. "
                f"Supported types: {', '.join(self.TRANSFORM_TYPES)}"
            )
        
        # 根据转换类型验证特定字段
        if transform_type == "mapping":
            if "mappings" not in config:
                raise NodeValidationError("mapping type requires 'mappings' field")
            
            mappings = config["mappings"]
            if not isinstance(mappings, dict) or len(mappings) == 0:
                raise NodeValidationError("mappings must be a non-empty dictionary")
        
        elif transform_type in ["filter", "extract"]:
            if "fields" not in config:
                raise NodeValidationError(f"{transform_type} type requires 'fields' field")
            
            fields = config["fields"]
            if not isinstance(fields, list) or len(fields) == 0:
                raise NodeValidationError("fields must be a non-empty list")
        
        elif transform_type == "merge":
            if "sources" not in config:
                raise NodeValidationError("merge type requires 'sources' field")
            
            sources = config["sources"]
            if not isinstance(sources, list) or len(sources) == 0:
                raise NodeValidationError("sources must be a non-empty list")
        
        elif transform_type == "custom":
            if "expression" not in config:
                raise NodeValidationError("custom type requires 'expression' field")
            
            expression = config["expression"]
            if not isinstance(expression, str) or not expression.strip():
                raise NodeValidationError("expression must be a non-empty string")
        
        return True

    async def execute(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> NodeResult:
        """执行转换节点
        
        Args:
            node_config: 节点配置
            context: 执行上下文
            
        Returns:
            NodeResult: 节点执行结果
            
        Raises:
            NodeExecutionError: 执行错误
        """
        try:
            transform_type = node_config["transform_type"]
            
            self.log_info(
                f"Executing transform type: {transform_type}",
                context
            )
            
            # 根据转换类型执行相应操作
            if transform_type == "mapping":
                output = self._execute_mapping(node_config, context)
            elif transform_type == "filter":
                output = self._execute_filter(node_config, context)
            elif transform_type == "extract":
                output = self._execute_extract(node_config, context)
            elif transform_type == "merge":
                output = self._execute_merge(node_config, context)
            elif transform_type == "custom":
                output = self._execute_custom(node_config, context)
            else:
                raise NodeExecutionError(f"Unsupported transform type: {transform_type}")
            
            self.log_info(
                f"Transform completed, output type: {type(output).__name__}",
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
            error_msg = f"Unexpected error in transform node: {str(e)}"
            self.log_error(error_msg, context)
            raise NodeExecutionError(error_msg) from e

    def _execute_mapping(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> Dict[str, Any]:
        """执行字段映射
        
        Args:
            node_config: 节点配置
            context: 执行上下文
            
        Returns:
            映射后的数据
        """
        mappings = node_config["mappings"]
        output = {}
        
        for output_field, template in mappings.items():
            # 解析模板中的变量
            if isinstance(template, str):
                value = context.resolve_variables(template)
            else:
                value = template
            
            output[output_field] = value
            
            self.log_debug(
                f"Mapped field: {output_field} = {value}",
                context
            )
        
        return output

    def _execute_filter(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> Dict[str, Any]:
        """执行字段过滤（保留指定字段）
        
        Args:
            node_config: 节点配置
            context: 执行上下文
            
        Returns:
            过滤后的数据
        """
        fields = node_config["fields"]
        
        # 获取输入数据
        source_node = node_config.get("source_node")
        if source_node:
            input_data = context.get_node_output(source_node)
        else:
            input_data = context.input_data
        
        if not isinstance(input_data, dict):
            raise NodeExecutionError(
                f"Filter transform requires dict input, got {type(input_data).__name__}"
            )
        
        # 过滤字段
        output = {field: input_data.get(field) for field in fields if field in input_data}
        
        self.log_info(
            f"Filtered {len(output)} fields from {len(input_data)} total fields",
            context
        )
        
        return output

    def _execute_extract(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> Any:
        """执行字段提取（提取单个字段值）
        
        Args:
            node_config: 节点配置
            context: 执行上下文
            
        Returns:
            提取的字段值
        """
        fields = node_config["fields"]
        
        # 获取输入数据
        source_node = node_config.get("source_node")
        if source_node:
            input_data = context.get_node_output(source_node)
        else:
            input_data = context.input_data
        
        # 如果只提取一个字段，直接返回值
        if len(fields) == 1:
            field = fields[0]
            if isinstance(input_data, dict):
                value = input_data.get(field)
            else:
                value = None
            
            self.log_info(f"Extracted field: {field} = {value}", context)
            return value
        
        # 提取多个字段，返回字典
        if not isinstance(input_data, dict):
            raise NodeExecutionError(
                f"Extract transform requires dict input, got {type(input_data).__name__}"
            )
        
        output = {field: input_data.get(field) for field in fields}
        
        self.log_info(f"Extracted {len(output)} fields", context)
        
        return output

    def _execute_merge(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> Dict[str, Any]:
        """执行数据合并
        
        Args:
            node_config: 节点配置
            context: 执行上下文
            
        Returns:
            合并后的数据
        """
        sources = node_config["sources"]
        output = {}
        
        for source_node_id in sources:
            source_data = context.get_node_output(source_node_id)
            
            if source_data is None:
                self.log_warning(
                    f"Source node {source_node_id} has no output, skipping",
                    context
                )
                continue
            
            if isinstance(source_data, dict):
                # 合并字典
                output.update(source_data)
                self.log_debug(
                    f"Merged data from node {source_node_id}: {len(source_data)} fields",
                    context
                )
            else:
                # 非字典数据，使用节点ID作为键
                output[source_node_id] = source_data
                self.log_debug(
                    f"Added data from node {source_node_id} as field",
                    context
                )
        
        self.log_info(
            f"Merged data from {len(sources)} sources, total fields: {len(output)}",
            context
        )
        
        return output

    def _execute_custom(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> Any:
        """执行自定义转换
        
        使用简单的表达式评估。出于安全考虑，仅支持基本的数据操作。
        
        Args:
            node_config: 节点配置
            context: 执行上下文
            
        Returns:
            转换后的数据
        """
        expression = node_config["expression"]
        
        # 获取输入数据
        source_node = node_config.get("source_node")
        if source_node:
            input_data = context.get_node_output(source_node)
        else:
            input_data = context.input_data
        
        # 准备安全的执行环境
        # 注意：这是一个简化的实现，生产环境应该使用更安全的沙箱
        safe_globals = {
            "__builtins__": {
                "len": len,
                "str": str,
                "int": int,
                "float": float,
                "bool": bool,
                "list": list,
                "dict": dict,
                "tuple": tuple,
                "set": set,
                "sum": sum,
                "min": min,
                "max": max,
                "abs": abs,
                "round": round,
                "sorted": sorted,
                "reversed": reversed,
                "enumerate": enumerate,
                "zip": zip,
                "map": map,
                "filter": filter,
                "any": any,
                "all": all,
            },
            "json": json,
        }
        
        safe_locals = {
            "input": input_data,
            "context": {
                "execution_id": context.execution_id,
                "workflow_id": context.workflow_id,
            },
        }
        
        try:
            # 评估表达式
            result = eval(expression, safe_globals, safe_locals)
            
            self.log_info(
                f"Custom expression evaluated successfully, result type: {type(result).__name__}",
                context
            )
            
            return result
            
        except Exception as e:
            error_msg = f"Error evaluating custom expression: {str(e)}"
            self.log_error(error_msg, context)
            raise NodeExecutionError(error_msg) from e
