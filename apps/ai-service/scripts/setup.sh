#!/bin/bash

# AI Service 快速设置脚本

set -e

echo "🚀 AI Workflow Service - 快速设置"
echo "=================================="
echo ""

# 检查Python版本
echo "📋 检查Python版本..."
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到Python3"
    echo "请安装Python 3.12或更高版本"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "✓ Python版本: $PYTHON_VERSION"
echo ""

# 检查Poetry
echo "📋 检查Poetry..."
if ! command -v poetry &> /dev/null; then
    echo "⚠️  Poetry未安装"
    echo "正在安装Poetry..."
    curl -sSL https://install.python-poetry.org | python3 -
    
    # 添加Poetry到PATH
    export PATH="$HOME/.local/bin:$PATH"
    
    if ! command -v poetry &> /dev/null; then
        echo "❌ Poetry安装失败"
        echo "请手动安装: https://python-poetry.org/docs/#installation"
        exit 1
    fi
fi

POETRY_VERSION=$(poetry --version | cut -d' ' -f3)
echo "✓ Poetry版本: $POETRY_VERSION"
echo ""

# 安装依赖
echo "📦 安装项目依赖..."
poetry install
echo "✓ 依赖安装完成"
echo ""

# 创建.env文件
if [ ! -f .env ]; then
    echo "📝 创建环境配置文件..."
    cp .env.example .env
    echo "✓ .env文件已创建"
    echo ""
fi

# 运行测试
echo "🧪 运行测试..."
poetry run pytest -v
echo ""

echo "✅ 设置完成!"
echo ""
echo "下一步:"
echo "  1. 根据需要修改 .env 文件"
echo "  2. 启动开发服务器: make dev"
echo "  3. 访问 http://localhost:8000/docs 查看API文档"
echo ""
