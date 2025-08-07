# 微表情分析集成说明

## 概述
本项目已成功集成讯飞星火大模型API进行微表情分析，并将其应用到面试评分机制中。通过分析面试过程中的人物微表情，可以更准确地评估应聘者的情绪状态、自信心和面试表现。

## 功能特性

### 1. 微表情分析
- **官方API集成**：使用讯飞星火大模型API进行图片分析
- **专业分析**：针对面试场景进行专门的微表情分析
- **多维度评估**：分析面部表情、情绪状态、微表情细节等
- **JSON格式输出**：结构化的分析结果，便于后续处理

### 2. 智能问题生成
- **微表情感知**：根据微表情分析结果调整问题策略
- **情绪适配**：发现紧张情绪时提出更温和的问题
- **挑战性调整**：发现自信情绪时提出更有挑战性的问题
- **实时分析**：在面试过程中实时分析并调整

### 3. 综合评分机制
- **七维度评估**：专业知识、技能匹配、语言表达、逻辑思维、创新能力、应变抗压、情绪稳定性
- **微表情权重**：将微表情分析结果纳入评分体系
- **情绪稳定性**：新增情绪稳定性维度，重点关注面试者的心理状态
- **影响分析**：分析微表情对面试表现的具体影响

## 技术实现

### 1. 图片分析流程
```python
# 使用官方API进行微表情分析
analysis_result = cpp_sdk.analyze_image(
    image_path=image_path,
    analysis_type="interview_scene",
    detect_faces=True,
    analyze_emotion=True,
    analyze_micro_expression=True
)
```

### 2. 问题生成策略
```python
# 根据微表情分析结果调整问题
if 发现紧张情绪:
    提出更温和、鼓励性的问题
elif 发现自信情绪:
    提出更有挑战性的问题
else:
    提出标准专业问题
```

### 3. 评分机制
```python
# 七维度评分包含情绪稳定性
abilities = {
    "专业知识水平": 0-100,
    "技能匹配度": 0-100,
    "语言表达能力": 0-100,
    "逻辑思维能力": 0-100,
    "创新能力": 0-100,
    "应变抗压能力": 0-100,
    "情绪稳定性": 0-100  # 新增维度
}
```

## API接口

### 1. 面试图片上传和分析
- **接口**：`POST /api/ai_next_question`
- **功能**：上传面试图片并进行微表情分析
- **参数**：
  - `images`: 面试图片文件（多文件）
  - `position`: 面试职位
  - `current_question`: 当前问题
  - `user_answer`: 用户回答
  - `chat_id`: 会话ID
- **返回**：
  - `question`: 下一个问题
  - `image_analyses`: 微表情分析结果
  - `micro_expressions_detected`: 检测到的微表情数量

### 2. 面试评估（含微表情）
- **接口**：`POST /api/interview_evaluate`
- **功能**：结合微表情分析进行面试评估
- **参数**：
  - `position`: 面试职位
  - `questions`: 问题列表
  - `answers`: 答案列表
  - `image_analyses`: 微表情分析结果（可选）
  - `chat_id`: 会话ID
- **返回**：
  - `result`: 评估结果
  - `evaluation_type`: 评估类型（standard/with_micro_expressions）
  - `micro_expressions_analyzed`: 分析的微表情数量

## 配置要求

### 1. 环境变量
```env
# 讯飞星火大模型API配置
SPARK_APPID=your_appid_here
SPARK_API_SECRET=your_api_secret_here
SPARK_API_KEY=your_api_key_here
```

### 2. 依赖安装
```bash
pip install websocket-client==1.6.4
```

## 使用示例

### 1. 前端调用示例
```javascript
// 上传图片并获取下一个问题
const formData = new FormData();
formData.append('images', imageFile1);
formData.append('images', imageFile2);
formData.append('position', '软件工程师');
formData.append('current_question', '请介绍一下你的项目经验');
formData.append('user_answer', '我在XX公司负责...');
formData.append('chat_id', 'session_123');

const response = await fetch('/api/ai_next_question', {
    method: 'POST',
    body: formData
});

const result = await response.json();
console.log('下一个问题:', result.question);
console.log('微表情分析:', result.image_analyses);
```

### 2. 评估调用示例
```javascript
// 进行面试评估
const evaluationData = {
    position: '软件工程师',
    questions: ['问题1', '问题2'],
    answers: ['答案1', '答案2'],
    image_analyses: [/* 微表情分析结果 */],
    chat_id: 'session_123'
};

const response = await fetch('/api/interview_evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evaluationData)
});

const result = await response.json();
console.log('评估结果:', result.result);
console.log('评估类型:', result.evaluation_type);
```

## 注意事项

1. **图片质量**：建议使用清晰的正面照片，确保面部表情清晰可见
2. **光线条件**：良好的光线条件有助于提高分析准确性
3. **隐私保护**：所有图片分析都在服务器端进行，不会泄露个人信息
4. **API限制**：注意讯飞API的调用频率限制
5. **网络要求**：需要稳定的网络连接以支持实时分析

## 未来扩展

1. **实时分析**：支持视频流实时微表情分析
2. **情绪趋势**：分析面试过程中的情绪变化趋势
3. **个性化建议**：根据微表情分析提供个性化的面试建议
4. **多模态融合**：结合语音、文字和微表情进行综合分析 