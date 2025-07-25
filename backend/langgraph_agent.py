from langsmith import traceable
import requests
import os
from dotenv import load_dotenv

load_dotenv()

# LangSmith云端可视化配置（API Key等）
LANGCHAIN_API_KEY = os.getenv('LANGCHAIN_API_KEY', '')
LANGCHAIN_ENDPOINT = os.getenv('LANGCHAIN_ENDPOINT', 'https://api.smith.langchain.com')
# 若需可视化，用户需在.env中补充API Key

AI_BASE_URL = os.getenv('AI_BASE_URL', 'http://127.0.0.1:8081')

class CppAISDK:
    def __init__(self, base_url):
        self.base_url = base_url

    @traceable(name="cpp_ai_llm")
    def ask_llm(self, prompt, model="spark", images=None):
        if images:
            res = requests.post(f"{self.base_url}/api/llm", json={"question": prompt, "images": images, "model": model})
        else:
            res = requests.post(f"{self.base_url}/api/llm", data={"question": prompt, "model": model})
        return res.json().get("answer", "")

    @traceable(name="cpp_ai_asr")
    def asr(self, audio_path, language="zh_cn"):
        with open(audio_path, "rb") as f:
            res = requests.post(f"{self.base_url}/api/asr", files={"audio": f}, data={"language": language})
        return res.json().get("text", "")

cpp_sdk = CppAISDK(AI_BASE_URL)

@traceable(name="interview_next_question")
def next_question(position, questions, answers):
    """
    输入：岗位、历史问题、历史答案
    输出：下一个AI问题
    """
    if not questions:
        prompt = f"你是{position}岗位的面试官，请给出第一个面试问题。"
        q = cpp_sdk.ask_llm(prompt)
        return q
    else:
        i = len(questions) - 1
        prompt = (
            f"你是{position}岗位的面试官。已问过如下问题及回答：\n" +
            "".join([f"Q{j+1}:{questions[j]}\nA{j+1}:{answers[j]}\n" for j in range(i+1)]) +
            "请根据应聘者的最新回答，提出下一个更有针对性的问题。"
        )
        next_q = cpp_sdk.ask_llm(prompt)
        return next_q

@traceable(name="interview_evaluate")
def evaluate_interview(position, questions, answers):
    """
    输入：岗位、全部问题、全部答案
    输出：评测结果（JSON字符串）
    """
    eval_prompt = "请根据以下面试问题和回答，从专业知识水平、技能匹配度、语言表达能力、逻辑思维能力、创新能力、应变抗压能力六个维度，量化评测并给出建议：\n"
    for i, (q, a) in enumerate(zip(questions, answers)):
        eval_prompt += f"Q{i+1}: {q}\nA{i+1}: {a}\n"
    eval_prompt += "请以JSON格式返回各项能力分数和改进建议。"
    eval_result = cpp_sdk.ask_llm(eval_prompt)
    return eval_result 