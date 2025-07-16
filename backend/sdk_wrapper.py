import random

POSITIONS = [
    "人工智能技术岗",
    "大数据开发岗",
    "物联网工程岗",
    "智能系统产品岗"
]

QUESTIONS = {
    "人工智能技术岗": ["请介绍一下你对深度学习的理解。", "你如何看待AI伦理问题？"],
    "大数据开发岗": ["请谈谈你对Hadoop生态的了解。", "如何优化大数据处理性能？"],
    "物联网工程岗": ["物联网安全有哪些挑战？", "请描述一个典型的IoT应用场景。"],
    "智能系统产品岗": ["你如何进行产品需求分析？", "请举例说明智能系统的用户体验优化。"]
}

ABILITY_INDICATORS = [
    "专业知识水平", "技能匹配度", "语言表达能力", "逻辑思维能力", "创新能力", "应变抗压能力"
]

def get_positions():
    return POSITIONS

def get_questions(position):
    return QUESTIONS.get(position, [])

def analyze_interview(audio, text, video=None, position=None):
    # 模拟多模态分析
    abilities = {k: random.randint(60, 100) for k in ABILITY_INDICATORS}
    key_issues = []
    if text and "star" not in text.lower():
        key_issues.append("回答缺乏STAR结构")
    if video is not None:
        key_issues.append("眼神交流不足")
    suggestions = [
        "建议回答时多用STAR结构。",
        "注意语速和语调，增强表达感染力。",
        "可结合实际案例，突出创新点。"
    ]
    if key_issues:
        suggestions = [f"改进：{issue}" for issue in key_issues] + suggestions
    return {
        "abilities": abilities,
        "key_issues": key_issues,
        "suggestions": suggestions
    } 