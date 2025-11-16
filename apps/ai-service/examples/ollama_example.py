"""OllamaService使用示例"""

import asyncio

from app.services import OllamaService


async def example_basic_usage():
    """基本使用示例"""
    print("=== 基本使用示例 ===\n")

    # 创建服务实例
    service = OllamaService(base_url="http://localhost:11434")

    try:
        # 1. 健康检查
        print("1. 检查Ollama服务健康状态...")
        is_healthy = await service.health_check()
        print(f"   服务状态: {'健康' if is_healthy else '不可用'}\n")

        if not is_healthy:
            print("Ollama服务不可用，请确保Ollama正在运行")
            return

        # 2. 获取模型列表
        print("2. 获取可用模型列表...")
        models = await service.list_models()
        print(f"   找到 {len(models)} 个模型:")
        for model in models:
            print(f"   - {model.get('name')}")
        print()

        if not models:
            print("没有可用的模型，请先拉取模型")
            return

        # 3. 非流式生成
        model_name = models[0].get("name")
        print(f"3. 使用模型 '{model_name}' 进行非流式生成...")
        prompt = "What is the capital of France? Answer in one sentence."
        response = await service.generate(model=model_name, prompt=prompt, stream=False)
        print(f"   提示词: {prompt}")
        print(f"   响应: {response}\n")

        # 4. 流式生成
        print(f"4. 使用模型 '{model_name}' 进行流式生成...")
        prompt = "Count from 1 to 5."
        print(f"   提示词: {prompt}")
        print("   响应: ", end="", flush=True)

        stream = await service.generate(model=model_name, prompt=prompt, stream=True)
        async for chunk in stream:
            print(chunk, end="", flush=True)
        print("\n")

        # 5. 获取模型详细信息
        print(f"5. 获取模型 '{model_name}' 的详细信息...")
        model_info = await service.show_model(model_name)
        print(f"   模型文件: {model_info.get('modelfile', 'N/A')[:50]}...")
        print()

    except Exception as e:
        print(f"错误: {e}")
    finally:
        # 关闭连接
        await service.close()
        print("连接已关闭")


async def example_context_manager():
    """使用上下文管理器示例"""
    print("\n=== 上下文管理器示例 ===\n")

    async with OllamaService() as service:
        is_healthy = await service.health_check()
        print(f"服务状态: {'健康' if is_healthy else '不可用'}")

        if is_healthy:
            models = await service.list_models()
            print(f"可用模型数量: {len(models)}")


async def example_error_handling():
    """错误处理示例"""
    print("\n=== 错误处理示例 ===\n")

    from app.services import (
        OllamaConnectionError,
        OllamaModelNotFoundError,
        OllamaServiceError,
    )

    service = OllamaService(base_url="http://localhost:11434")

    try:
        # 尝试使用不存在的模型
        print("尝试使用不存在的模型...")
        await service.generate(model="nonexistent-model", prompt="test", stream=False)

    except OllamaModelNotFoundError as e:
        print(f"捕获到模型未找到错误: {e}")

    except OllamaConnectionError as e:
        print(f"捕获到连接错误: {e}")

    except OllamaServiceError as e:
        print(f"捕获到服务错误: {e}")

    finally:
        await service.close()


async def example_pull_model():
    """拉取模型示例"""
    print("\n=== 拉取模型示例 ===\n")

    async with OllamaService() as service:
        model_name = "tinyllama"  # 使用较小的模型作为示例

        print(f"开始拉取模型: {model_name}")
        print("(这可能需要几分钟时间...)\n")

        try:
            async for progress in service.pull_model(model_name):
                status = progress.get("status", "")
                if "total" in progress and "completed" in progress:
                    total = progress["total"]
                    completed = progress["completed"]
                    percent = (completed / total * 100) if total > 0 else 0
                    print(f"\r{status}: {percent:.1f}%", end="", flush=True)
                else:
                    print(f"\r{status}", end="", flush=True)

            print("\n模型拉取完成!")

        except Exception as e:
            print(f"\n拉取失败: {e}")


async def main():
    """主函数"""
    print("OllamaService 使用示例\n")
    print("=" * 50)

    # 运行示例
    await example_basic_usage()
    await example_context_manager()
    await example_error_handling()

    # 取消注释以下行来测试模型拉取（需要较长时间）
    # await example_pull_model()


if __name__ == "__main__":
    asyncio.run(main())
