.PHONY: install dev test lint format clean help

help: ## 显示帮助信息
	@echo "可用命令:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## 安装依赖
	poetry install

dev: ## 启动开发服务器
	poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test: ## 运行测试
	poetry run pytest -v

test-cov: ## 运行测试并生成覆盖率报告
	poetry run pytest --cov=app --cov-report=html --cov-report=term

lint: ## 运行代码检查
	poetry run ruff check app/ tests/
	poetry run mypy app/

format: ## 格式化代码
	poetry run black app/ tests/
	poetry run ruff check --fix app/ tests/

clean: ## 清理临时文件
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache .coverage htmlcov/ dist/ build/

shell: ## 进入Poetry shell
	poetry shell
