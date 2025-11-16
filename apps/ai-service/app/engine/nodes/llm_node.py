"""LLM节点执行器"""

from typing import Any, Dict, AsyncIterator
import logging

from app.engine.nodes.base import NodeExecutor, NodeExecutionError, NodeValidationError
from app.engine.context import ExecutionContext
from app.schemas.node import NodeResult
from app.services.ollama_service import OllamaService, OllamaServiceError

logger = logging.getLogger(__name__)


class LLMNodeExecutor(NodeExecutor):
    """LLM节点执行器
    
    调用Ollama服务执行大语言模型推理。
    
    配置参数:
    - model: 模型名称（必需）
    - prompt: 提示词模板（必需）
    - stream: 是否使用流式输出（可选，默认False）
    - temperature: 温度参数（可选，默认0.7）
    - max_tokens: 最大token数（可选）
    - top_p: top_p参数（可选）
    - top_k: top_k参数（可选）
    """

    def __init__(self, node_id: str, ollama_service: OllamaService):
        """初始化LLM节点执行器
        
        Args:
            node_id: 节点ID
            ollama_service: Ollama服务实例
        """
        super().__init__(node_id, "llm")
        self.ollama_service = ollama_service

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
        if "model" not in config:
            raise NodeValidationError("Missing required field: model")
        
        if "prompt" not in config:
            raise NodeValidationError("Missing required field: prompt")
        
        # 验证模型名称
        model = config["model"]
        if not isinstance(model, str) or not model.strip():
            raise NodeValidationError("Model must be a non-empty string")
        
        # 验证提示词
        prompt = config["prompt"]
        if not isinstance(prompt, str) or not prompt.strip():
            raise NodeValidationError("Prompt must be a non-empty string")
        
        # 验证可选参数
        if "stream" in config and not isinstance(config["stream"], bool):
            raise NodeValidationError("Stream must be a boolean")
        
        if "temperature" in config:
            temp = config["temperature"]
            if not isinstance(temp, (int, float)) or temp < 0 or temp > 2:
                raise NodeValidationError("Temperature must be between 0 and 2")
        
        if "max_tokens" in config:
            max_tokens = config["max_tokens"]
            if not isinstance(max_tokens, int) or max_tokens <= 0:
                raise NodeValidationError("Max tokens must be a positive integer")
        
        return True

    async def execute(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> NodeResult:
        """执行LLM节点
        
        Args:
            node_config: 节点配置
            context: 执行上下文
            
        Returns:
            NodeResult: 节点执行结果
            
        Raises:
            NodeExecutionError: 执行错误
        """
        try:
            # 构建提示词
            prompt = self._build_prompt(node_config, context)
            
            # 获取模型参数
            model = node_config["model"]
            stream = node_config.get("stream", False)
            
            # 构建Ollama参数
            ollama_params = self._build_ollama_params(node_config)
            
            self.log_info(
                f"Calling LLM model '{model}' with prompt length: {len(prompt)}",
                context
            )
            
            # 调用Ollama服务
            if stream:
                # 流式输出
                output = await self._stream_generate(
                    model, prompt, context, **ollama_params
                )
            else:
                # 批量输出
                output = await self.ollama_service.generate(
                    model=model,
                    prompt=prompt,
                    stream=False,
                    **ollama_params
                )
            
            self.log_info(
                f"LLM generation completed, output length: {len(str(output))}",
                context
            )
            
            return NodeResult(
                node_id=self.node_id,
                status="success",
                output=output,
            )
            
        except OllamaServiceError as e:
            error_msg = f"Ollama service error: {str(e)}"
            self.log_error(error_msg, context)
            raise NodeExecutionError(error_msg) from e
        
        except Exception as e:
            error_msg = f"Unexpected error in LLM node: {str(e)}"
            self.log_error(error_msg, context)
            raise NodeExecutionError(error_msg) from e

    def _build_prompt(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> str:
        """构建提示词
        
        支持变量替换，格式: {{variable_name}}
        
        Args:
            node_config: 节点配置
            context: 执行上下文
            
        Returns:
            str: 解析后的提示词
        """
        prompt_template = node_config["prompt"]
        
        # 解析变量引用
        prompt = context.resolve_variables(prompt_template)
        
        return prompt

    def _build_ollama_params(self, node_config: Dict[str, Any]) -> Dict[str, Any]:
        """构建Ollama参数
        
        Args:
            node_config: 节点配置
            
        Returns:
            Dict: Ollama参数
        """
        params = {}
        
        # 可选参数
        if "temperature" in node_config:
            params["temperature"] = node_config["temperature"]
        
        if "max_tokens" in node_config:
            params["num_predict"] = node_config["max_tokens"]
        
        if "top_p" in node_config:
            params["top_p"] = node_config["top_p"]
        
        if "top_k" in node_config:
            params["top_k"] = node_config["top_k"]
        
        return params

    async def _stream_generate(
        self,
        model: str,
        prompt: str,
        context: ExecutionContext,
        **kwargs: Any,
    ) -> str:
        """流式生成并收集完整输出
        
        Args:
            model: 模型名称
            prompt: 提示词
            context: 执行上下文
            **kwargs: 其他参数
            
        Returns:
            str: 完整的生成文本
        """
        full_output = []
        
        # 获取流式生成器
        stream: AsyncIterator[str] = await self.ollama_service.generate(
            model=model,
            prompt=prompt,
            stream=True,
            **kwargs
        )
        
        # 收集流式输出
        async for chunk in stream:
            full_output.append(chunk)
            
            # 可以在这里添加实时日志
            if len(full_output) % 10 == 0:  # 每10个chunk记录一次
                self.log_debug(
                    f"Generated {len(full_output)} chunks, "
                    f"total length: {sum(len(c) for c in full_output)}",
                    context
                )
        
        return "".join(full_output)
