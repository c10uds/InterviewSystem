# Git 提交规范与常用命令

## 分支管理
- 主分支：`main`（或 `master`）
- 开发分支：`develop`（新功能、修复等先合并到 develop，再合并到 main）

## 提交信息规范
- feat: 新功能（feature）
- fix: 修复 bug
- docs: 文档变更
- style: 代码格式（不影响功能，如空格、分号等）
- refactor: 代码重构（不影响功能和 bug）
- perf: 性能优化
- test: 增加/修改测试用例
- chore: 构建过程或辅助工具变动

**示例：**
```
feat: 增加岗位选择和题库接口
fix: 修复前端音频上传bug
```

## 常用 Git 命令

### 初始化仓库
```bash
git init
git add .
git commit -m "初始化项目"
```

### 关联远程仓库
```bash
git remote add origin <远程仓库地址>
```

### 创建 develop 分支并推送
```bash
git checkout -b develop
git push -u origin develop
```

### 新建功能分支
```bash
git checkout develop
git pull origin develop
git checkout -b feature/xxx
```

### 合并分支
```bash
git checkout develop
git pull origin develop
git merge feature/xxx
git push origin develop
```

### 合并到主分支
```bash
git checkout main
git pull origin main
git merge develop
git push origin main
```

### 日常开发流程
1. 从 develop 拉新分支开发
2. 提交代码并推送到远端
3. 合并到 develop，测试无误后再合并到 main

### 同步远端代码
```bash
git pull origin develop   # 拉取 develop 分支最新代码
git pull origin main      # 拉取主分支最新代码
```

### 提交代码
```bash
git add .
git commit -m "feat: xxx"
git push origin 当前分支名
```

---
如有团队协作，建议所有新开发代码先合并到 develop 分支，主分支仅保留稳定版本。
