#!/bin/bash

# Git 提交作者批量修改脚本 - 修正版本
# 修复了语法错误问题

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 配置信息 - 请根据实际情况修改
OLD_EMAIL="gaow-a@glodon.com"
CORRECT_NAME="RootLoveWorld"
CORRECT_EMAIL="gaoweitiandao@163.com"

echo -e "${GREEN}=== Git 提交作者批量修改脚本 ===${NC}"
echo ""

# 函数：显示当前仓库信息
show_repo_info() {
    echo -e "${YELLOW}当前仓库信息：${NC}"
    echo "仓库路径：$(pwd)"
    echo "当前分支：$(git branch --show-current)"
    echo ""
}

# 函数：验证 Git 仓库状态
validate_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${RED}错误：当前目录不是 Git 仓库${NC}"
        exit 1
    fi
}

# 函数：显示当前作者配置
show_current_config() {
    echo -e "${YELLOW}当前 Git 配置：${NC}"
    git config --list | grep -E "user.(name|email)" || echo "未设置用户配置"
    echo ""
}

# 函数：备份当前分支
backup_branch() {
    local current_branch
    current_branch=$(git branch --show-current)
    local backup_name
    backup_name="${current_branch}-backup-$(date +%Y%m%d-%H%M%S)"
    
    echo -e "${YELLOW}创建备份分支：${backup_name}${NC}"
    git branch "${backup_name}"
    echo -e "${GREEN}备份分支创建成功${NC}"
    echo ""
}

# 函数：执行作者信息修改
change_author_info() {
    echo -e "${YELLOW}开始修改提交作者信息...${NC}"
    echo "旧邮箱：${OLD_EMAIL}"
    echo "新作者：${CORRECT_NAME}"
    echo "新邮箱：${CORRECT_EMAIL}"
    echo ""
    
    git filter-branch --env-filter "
if [ \"\$GIT_COMMITTER_EMAIL\" = \"${OLD_EMAIL}\" ]; then
    export GIT_COMMITTER_NAME=\"${CORRECT_NAME}\"
    export GIT_COMMITTER_EMAIL=\"${CORRECT_EMAIL}\"
fi
if [ \"\$GIT_AUTHOR_EMAIL\" = \"${OLD_EMAIL}\" ]; then
    export GIT_AUTHOR_NAME=\"${CORRECT_NAME}\"
    export GIT_AUTHOR_EMAIL=\"${CORRECT_EMAIL}\"
fi
" --tag-name-filter cat -- --branches --tags
    
    echo -e "${GREEN}提交作者信息修改完成${NC}"
    echo ""
}

# 函数：清理备份
cleanup_backup() {
    echo -e "${YELLOW}清理临时文件...${NC}"
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
    echo -e "${GREEN}清理完成${NC}"
    echo ""
}

# 函数：强制推送到远程仓库
force_push_to_remote() {
    local current_branch
    current_branch=$(git branch --show-current)
    
    echo -e "${YELLOW}准备强制推送到远程仓库...${NC}"
    echo -e "${RED}警告：此操作将覆盖远程仓库的历史记录${NC}"
    echo ""
    
    read -p "是否继续强制推送？(y/N): " confirm
    if [[ $confirm != [yY] ]]; then
        echo "操作已取消"
        exit 0
    fi
    
    echo -e "${YELLOW}执行强制推送...${NC}"
    git push --force-with-lease origin "${current_branch}"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}强制推送成功${NC}"
    else
        echo -e "${RED}强制推送失败${NC}"
        exit 1
    fi
}

# 主执行流程
main() {
    validate_git_repo
    show_repo_info
    show_current_config
    backup_branch
    change_author_info
    
    echo -e "${YELLOW}是否要强制推送到远程仓库？${NC}"
    echo "1. 仅修改本地历史"
    echo "2. 修改本地并强制推送到远程"
    echo ""
    
    read -p "请选择 (1/2): " push_option
    
    case $push_option in
        1) echo -e "${GREEN}本地历史修改完成，未推送到远程${NC}" ;;
        2) force_push_to_remote ;;
        *) echo -e "${RED}无效选择，操作结束${NC}" ;;
    esac
    
    cleanup_backup
    echo -e "${GREEN}=== 脚本执行完成 ===${NC}"
}

# 执行主函数
main "$@"
