# API文档

## 用户认证相关

**POST /api/login**
- params: email, password
- 作用: 用户登录

**POST /api/register**
- params: email, password, name, phone, school, grade, target_position
- 作用: 用户注册

**POST /api/logout**
- params: 无
- 作用: 用户登出

## 基础功能

**GET /api/health**
- params: 无
- 作用: 健康检查

**GET /api/positions**
- params: 无
- 作用: 获取职位列表

**GET /api/questions**
- params: position
- 作用: 获取预设问题列表

## 面试相关

**POST /api/interview**
- params: position
- 作用: 开始面试

**POST /api/interview_next**
- params: position, questions, answers, chat_id
- 作用: 获取下一个面试问题

**POST /api/interview_evaluate**
- params: position, questions, answers, image_analyses, chat_id
- 作用: 评估面试结果

**GET /api/interview_records**
- params: 无
- 作用: 获取面试记录

## AI面试相关

**POST /api/ai_questions**
- params: position, resume_content
- 作用: AI生成第一个面试问题

**POST /api/ai_next_question**
- params: position, current_question, user_answer, chat_id, audio, images, code_submission
- 作用: AI根据回答生成下一个问题

## 用户资料相关

**GET /api/profile**
- params: 无
- 作用: 获取用户资料

**POST /api/upload_avatar**
- params: avatar
- 作用: 上传头像

**POST /api/upload_resume**
- params: resume
- 作用: 上传简历

**POST /api/generate_questions_from_resume**
- params: position, resume_content
- 作用: 根据简历生成问题

## 管理员功能

**GET /api/admin/stats**
- params: 无
- 作用: 管理员统计数据

**GET /api/admin/users**
- params: page, per_page
- 作用: 获取所有用户列表

**PUT /api/admin/users/<user_id>**
- params: is_admin, name, phone, school, grade, target_position
- 作用: 更新用户信息

**DELETE /api/admin/users/<user_id>**
- params: 无
- 作用: 删除用户

**GET /api/admin/positions**
- params: 无
- 作用: 获取所有岗位列表

**POST /api/admin/positions**
- params: name, description
- 作用: 新增岗位

**PUT /api/admin/positions/<position_id>**
- params: name, description, is_active
- 作用: 更新岗位信息

**DELETE /api/admin/positions/<position_id>**
- params: 无
- 作用: 删除岗位

**GET /api/admin/interviews**
- params: page, per_page
- 作用: 获取所有面试记录

**GET /api/admin/interviews/<interview_id>**
- params: 无
- 作用: 获取面试记录详情

## 静态资源

**GET /static/avatars/<filename>**
- params: filename
- 作用: 提供头像文件 