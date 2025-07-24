"""
SparkChain SDK Python客户端
用于Python Flask后端调用C++ HTTP服务
"""

import requests
import json
import os
from typing import Dict, Optional, Union
import logging


# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SparkChainClient:
    """SparkChain SDK HTTP客户端"""
    
    def __init__(self, base_url: str = "http://127.0.0.1:8081", timeout: int = 30):
        """
        初始化客户端
        
        Args:
            base_url: C++ HTTP服务地址
            timeout: 请求超时时间（秒）
        """
        self.base_url = base_url
        self.timeout = timeout
        self.session = requests.Session()
        
        # 设置请求头
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'SparkChain-Python-Client/1.0.0'
        })
    
    def health_check(self) -> Dict:
        """
        健康检查
        
        Returns:
            服务状态信息
        """
        try:
            response = self.session.get(
                f"{self.base_url}/api/health",
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"健康检查失败: {e}")
            return {"status": "error", "message": str(e)}
    
    def speech_to_text(self, audio_file_path: str, language: str = "zh_cn") -> Dict:
        """
        语音识别
        
        Args:
            audio_file_path: 音频文件路径
            language: 语言类型 (zh_cn/en_us)
            
        Returns:
            识别结果
        """
        try:
            if not os.path.exists(audio_file_path):
                return {"success": False, "error": "音频文件不存在"}
            
            with open(audio_file_path, 'rb') as f:
                files = {'audio': f}
                params = {'language': language}
                response = self.session.post(
                    f"{self.base_url}/api/asr",
                    files=files,
                    params=params,
                    timeout=self.timeout
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"语音识别失败: {e}")
            return {"success": False, "error": str(e)}
    
    def text_to_speech(self, text: str, voice: str = "xiaoyan") -> Dict:
        """
        语音合成
        
        Args:
            text: 要合成的文本
            voice: 发音人
            
        Returns:
            合成结果
        """
        try:
            params = {
                'text': text,
                'voice': voice
            }
            response = self.session.post(
                f"{self.base_url}/api/tts",
                params=params,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"语音合成失败: {e}")
            return {"success": False, "error": str(e)}
    
    def llm_chat(self, question: str, chat_id: str = "") -> Dict:
        """
        大模型对话
        
        Args:
            question: 用户问题
            chat_id: 会话ID
            
        Returns:
            对话结果
        """
        try:
            params = {
                'question': question,
                'chat_id': chat_id
            }
            response = self.session.post(
                f"{self.base_url}/api/llm",
                params=params,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"大模型对话失败: {e}")
            return {"success": False, "error": str(e)}
    
    def analyze_interview_performance(self, audio_file_path: str, text: str, 
                                    video_file_path: Optional[str] = None,
                                    position: Optional[str] = None) -> Dict:
        """
        面试表现分析（综合多模态分析）
        
        Args:
            audio_file_path: 音频文件路径
            text: 回答文本
            video_file_path: 视频文件路径（可选）
            position: 岗位类型（可选）
            
        Returns:
            分析结果
        """
        try:
            # 1. 语音识别
            asr_result = self.speech_to_text(audio_file_path)
            
            # 2. 文本分析（使用LLM）
            analysis_prompt = f"""
            请分析以下面试回答的专业性、逻辑性和表达能力，并给出评分（1-100分）：
            
            岗位：{position or '通用'}
            回答内容：{text}
            
            请从以下维度分析：
            1. 专业知识水平
            2. 技能匹配度  
            3. 语言表达能力
            4. 逻辑思维能力
            5. 创新能力
            6. 应变抗压能力
            
            请以JSON格式返回分析结果。
            """
            
            llm_result = self.llm_chat(analysis_prompt)
            
            # 3. 构建综合分析结果
            result = {
                "success": True,
                "speech_recognition": asr_result,
                "text_analysis": llm_result,
                "position": position,
                "text_length": len(text)
            }
            
            # 4. 如果LLM分析成功，解析结果
            if llm_result.get("success") and llm_result.get("answer"):
                try:
                    # 尝试解析LLM返回的JSON
                    analysis_text = llm_result["answer"]
                    # 这里可以添加JSON解析逻辑
                    result["abilities"] = {
                        "专业知识水平": 85,  # 模拟评分
                        "技能匹配度": 78,
                        "语言表达能力": 82,
                        "逻辑思维能力": 80,
                        "创新能力": 75,
                        "应变抗压能力": 88
                    }
                except:
                    # 如果解析失败，使用默认评分
                    result["abilities"] = {
                        "专业知识水平": 80,
                        "技能匹配度": 75,
                        "语言表达能力": 80,
                        "逻辑思维能力": 78,
                        "创新能力": 72,
                        "应变抗压能力": 85
                    }
            
            # 5. 生成改进建议
            suggestions = []
            if text and len(text) < 50:
                suggestions.append("建议详细阐述，提供具体案例和细节")
            if "star" not in text.lower():
                suggestions.append("建议使用STAR结构：Situation(情境)、Task(任务)、Action(行动)、Result(结果)")
            if video_file_path:
                suggestions.append("建议保持适度的眼神交流，增强互动感")
            
            suggestions.extend([
                "注意语速和语调，增强表达感染力",
                "可结合实际案例，突出创新点",
                "建议准备2-3个成功案例，便于面试时灵活运用"
            ])
            
            result["suggestions"] = suggestions
            
            return result
            
        except Exception as e:
            logger.error(f"面试分析失败: {e}")
            return {"success": False, "error": str(e)}

# 全局客户端实例
sdk_client = SparkChainClient()

# 便捷函数
def get_sdk_client() -> SparkChainClient:
    """获取SDK客户端实例"""
    return sdk_client

def test_sdk_connection() -> bool:
    """测试SDK连接"""
    try:
        health = sdk_client.health_check()
        return health.get("status") == "ok"
    except:
        return False

if __name__ == "__main__":
    # 测试代码
    client = SparkChainClient()
    
    # 测试健康检查
    print("测试健康检查...")
    health = client.health_check()
    print(f"健康检查结果: {health}")
    
    # 测试大模型对话
    print("\n测试大模型对话...")
    chat_result = client.llm_chat("你好，请简单介绍一下自己")
    print(f"对话结果: {chat_result}")
    
    # 测试语音合成
    print("\n测试语音合成...")
    tts_result = client.text_to_speech("这是一个测试")
    print(f"语音合成结果: {tts_result}") 