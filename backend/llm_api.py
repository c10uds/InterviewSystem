# -*- coding: utf-8 -*-
"""
大模型API相关功能
包含图片分析、语音识别和文本对话功能
"""

import base64
import hashlib
import hmac
import json
import os
import time
import threading
import logging
from urllib.parse import urlparse, urlencode
from wsgiref.handlers import format_date_time
from time import mktime
import requests
import websocket 

from config import (
    SPARK_APPID, SPARK_API_SECRET, SPARK_API_KEY,
    SPARK_IMAGE_URL, SPARK_ASR_URL, SPARK_HTTP_URL,
    FACE_APPID, FACE_API_KEY, FACE_EXPRESSION_URL
)

logger = logging.getLogger(__name__)

# 尝试导入websocket
try:
    import websocket
    import ssl
    WEBSOCKET_AVAILABLE = True
except ImportError:
    WEBSOCKET_AVAILABLE = False
    print("警告: websocket-client 未安装，WebSocket功能将不可用")

class AssembleHeaderException(Exception):
    def __init__(self, msg):
        self.message = msg

class Url:
    def __init__(this, host, path, schema):
        this.host = host
        this.path = path
        this.schema = schema
        pass

class Ws_Param(object):
    """WebSocket参数类，用于生成大模型API的认证URL"""
    def __init__(self, APPID, APIKey, APISecret, image_url):
        self.APPID = APPID
        # 确保API密钥格式正确（移除Bearer前缀）
        self.APIKey = APIKey.replace("Bearer ", "") if APIKey.startswith("Bearer ") else APIKey
        self.APISecret = APISecret
        self.host = urlparse(image_url).netloc
        self.path = urlparse(image_url).path
        self.ImageUnderstanding_url = image_url

    def create_url(self):
        # 生成RFC1123格式的时间戳
        import datetime
        now = datetime.datetime.now()
        date = format_date_time(mktime(now.timetuple()))

        # 拼接字符串
        signature_origin = "host: " + self.host + "\n"
        signature_origin += "date: " + date + "\n"
        signature_origin += "GET " + self.path + " HTTP/1.1"

        # 进行hmac-sha256进行加密
        signature_sha = hmac.new(self.APISecret.encode('utf-8'), signature_origin.encode('utf-8'),
                                 digestmod=hashlib.sha256).digest()

        signature_sha_base64 = base64.b64encode(signature_sha).decode(encoding='utf-8')

        authorization_origin = f'api_key="{self.APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature_sha_base64}"'

        authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode(encoding='utf-8')

        # 将请求的鉴权参数组合为字典
        v = {
            "authorization": authorization,
            "date": date,
            "host": self.host
        }
        # 拼接鉴权参数，生成url
        url = self.ImageUnderstanding_url + '?' + urlencode(v)
        return url

def sha256base64(data):
    """计算sha256并编码为base64"""
    sha256 = hashlib.sha256()
    sha256.update(data)
    digest = base64.b64encode(sha256.digest()).decode(encoding='utf-8')
    return digest

def parse_url(requset_url):
    """解析URL"""
    stidx = requset_url.index("://")
    host = requset_url[stidx + 3:]
    schema = requset_url[:stidx + 3]
    edidx = host.index("/")
    if edidx <= 0:
        raise AssembleHeaderException("invalid request url:" + requset_url)
    path = host[edidx:]
    host = host[:edidx]
    u = Url(host, path, schema)
    return u

def assemble_auth_url(requset_url, method="GET", api_key="", api_secret=""):
    """构建认证URL"""
    u = parse_url(requset_url)
    host = u.host
    path = u.path
    import datetime
    now = datetime.datetime.now()
    date = format_date_time(mktime(now.timetuple()))
    
    signature_origin = "host: {}\ndate: {}\n{} {} HTTP/1.1".format(host, date, method, path)
    signature_sha = hmac.new(api_secret.encode('utf-8'), signature_origin.encode('utf-8'),
                             digestmod=hashlib.sha256).digest()
    signature_sha = base64.b64encode(signature_sha).decode(encoding='utf-8')
    authorization_origin = "api_key=\"%s\", algorithm=\"%s\", headers=\"%s\", signature=\"%s\"" % (
        api_key, "hmac-sha256", "host date request-line", signature_sha)
    authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode(encoding='utf-8')
    
    values = {
        "host": host,
        "date": date,
        "authorization": authorization
    }
    return requset_url + "?" + urlencode(values)

# WebSocket回调函数
def on_error(ws, error):
    logger.error(f"[WebSocket] 错误: {error}")

def on_close(ws, one, two):
    logger.info("[WebSocket] 连接关闭")

def on_open(ws):
    import _thread as thread
    thread.start_new_thread(run, (ws,))

def run(ws, *args):
    data = json.dumps(gen_params(appid=ws.appid, question=ws.question))
    ws.send(data)

def on_message(ws, message):
    data = json.loads(message)
    code = data['header']['code']
    if code != 0:
        logger.error(f'[WebSocket] 请求错误: {code}, {data}')
        ws.close()
    else:
        choices = data["payload"]["choices"]
        status = choices["status"]
        content = choices["text"][0]["content"]
        logger.info(f"[WebSocket] 收到内容: {content}")
        global answer
        answer += content
        if status == 2:
            ws.close()

def gen_params(appid, question):
    """通过appid和用户的提问来生成请求参数"""
    data = {
        "header": {
            "app_id": appid
        },
        "parameter": {
            "chat": {
                "domain": "imagev3",
                "temperature": 0.5,
                "top_k": 4,
                "max_tokens": 2028,
                "auditing": "default"
            }
        },
        "payload": {
            "message": {
                "text": question
            }
        }
    }
    return data

def analyze_image_with_llm(image_path, question="请分析这张图片中的人物表情和情绪状态"):
    """使用大模型API分析图片"""
    if not WEBSOCKET_AVAILABLE:
        logger.error("[analyze_image_with_llm] WebSocket不可用")
        return {"success": False, "error": "WebSocket不可用", "source": "llm"}
    
    try:
        # 读取图片数据
        with open(image_path, 'rb') as f:
            imagedata = f.read()
        
        # 构建文本内容
        text = [{"role": "user", "content": str(base64.b64encode(imagedata), 'utf-8'), "content_type": "image"}]
        
        # 创建WebSocket参数 - 确保使用正确的API密钥格式
        api_key = SPARK_API_KEY.replace("Bearer ", "") if SPARK_API_KEY.startswith("Bearer ") else SPARK_API_KEY
        wsParam = Ws_Param(SPARK_APPID, api_key, SPARK_API_SECRET, SPARK_IMAGE_URL)
         # 修复未绑定问题
        websocket.enableTrace(False)
        wsUrl = wsParam.create_url()
        
        # 创建WebSocket连接
        ws = websocket.WebSocketApp(wsUrl, on_message=on_message, on_error=on_error, on_close=on_close, on_open=on_open)
        ws.appid = SPARK_APPID
        ws.question = question
        
        # 设置全局变量用于接收结果
        global answer
        answer = ""
        
        # 运行WebSocket连接
        ws.run_forever(sslopt={"cert_reqs": ssl.CERT_NONE})
        
        return {"success": True, "analysis": answer, "source": "llm"}
        
    except Exception as e:
        logger.error(f"[analyze_image_with_llm] 异常: {e}")
        return {"success": False, "error": str(e), "source": "llm"}

def get_face_api_header(image_name):
    """生成人脸API请求头"""
    import time
    import hashlib
    import base64
    import json
    
    curTime = str(int(time.time()))
    param = json.dumps({"image_name": image_name}, ensure_ascii=False)
    paramBase64 = base64.b64encode(param.encode('utf-8')).decode('utf-8')
    m2 = hashlib.md5()
    m2.update((FACE_API_KEY + curTime + paramBase64).encode('utf-8'))
    checkSum = m2.hexdigest()
    
    header = {
        'X-CurTime': curTime,
        'X-Param': paramBase64,
        'X-Appid': FACE_APPID,
        'X-CheckSum': checkSum,
    }
    return header

def analyze_image_with_face_expression_api(image_path):
    """使用讯飞人脸特征分析API分析图片表情"""
    try:
        import os
        import requests
        
        image_name = os.path.basename(image_path)
        headers = get_face_api_header(image_name)
        
        with open(image_path, 'rb') as f:
            data = f.read()
        
        logger.info(f"[analyze_image_with_face_expression_api] 开始分析图片: {image_path}")
        
        r = requests.post(FACE_EXPRESSION_URL, headers=headers, data=data)
        result = r.json()
        
        logger.info(f"[analyze_image_with_face_expression_api] API响应: {result}")
        
        if result.get('code') == 0 and result.get('data', {}).get('fileList'):
            file_info = result['data']['fileList'][0]
            
            # 表情标签映射
            expression_labels = [
                "愤怒 (Anger)", "厌恶 (Disgust)", "快乐 (Happiness)", 
                "中性 (Neutral)", "难过 (Sadness)", "惊讶 (Surprise)", 
                "恐惧 (Fear)", "轻蔑 (Contempt)"
            ]
            
            label = file_info.get('label', 0)
            label_name = expression_labels[label] if label < len(expression_labels) else f"表情{label}"
            rate = file_info.get('rate', 0)
            rates = file_info.get('rates', [])
            
            # 构建分析结果
            analysis_result = {
                "success": True,
                "label": label,
                "label_name": label_name,
                "rate": rate,
                "rates": rates,
                "statistic": result['data'].get('statistic', []),
                "analysis": f"主要表情: {label_name}, 置信度: {rate:.4f}",
                "emotions": {
                    "primary_emotion": label_name,
                    "confidence": rate
                },
                "micro_expressions": {
                    "detected": label_name,
                    "confidence": rate
                },
                "source": "face_expression_api",
                "raw": result
            }
            
            logger.info(f"[analyze_image_with_face_expression_api] 分析成功: {analysis_result['analysis']}")
            return analysis_result
        else:
            error_msg = result.get('desc', 'API调用失败')
            logger.error(f"[analyze_image_with_face_expression_api] 分析失败: {error_msg}")
            return {
                "success": False, 
                "error": error_msg, 
                "raw": result,
                "source": "face_expression_api"
            }
            
    except Exception as e:
        logger.error(f"[analyze_image_with_face_expression_api] 异常: {e}")
        return {
            "success": False, 
            "error": str(e),
            "source": "face_expression_api"
        }

def getText(text, role, content):
    """管理对话历史，按序编为列表"""
    jsoncon = {}
    jsoncon["role"] = role
    jsoncon["content"] = content
    text.append(jsoncon)
    return text

def getlength(text):
    """获取对话中的所有角色的content长度"""
    length = 0
    for content in text:
        temp = content["content"]
        leng = len(temp)
        length += leng
    return length

def checklen(text):
    """判断长度是否超长，当前限制11K tokens"""
    while (getlength(text) > 11000):
        del text[0]
    return text

def ask_llm_with_http(messages, api_key=None):
    """使用HTTP方式调用大模型API"""
    try:
        # 检查API配置
        if not api_key:
            api_key = SPARK_API_KEY
        
        if api_key == 'XXXXXXXXXXXXXXXXXXXXXXXX':
            logger.warning("[LLM] HTTP API未配置")
            return None        
        # 构建请求头 - 确保API密钥包含Bearer前缀
        if not api_key.startswith('Bearer '):
            api_key = f'Bearer {api_key}'
        
        headers = {
            'Authorization': api_key,
            'content-type': "application/json"
        }
        
        # 构建请求体
        body = {
            "model": "4.0Ultra",
            "user": "interview_user",
            "messages": messages,
            "stream": True,
            "tools": [
                {
                    "type": "web_search",
                    "web_search": {
                        "enable": True,
                        "search_mode": "deep"
                    }
                }
            ]
        }
        
        logger.info(f"[LLM] HTTP请求: {body}")
        
        # 发送请求
        response = requests.post(url=SPARK_HTTP_URL, json=body, headers=headers, stream=True)
        
        # 检查响应状态
        if response.status_code != 200:
            logger.error(f"[LLM] HTTP请求失败，状态码: {response.status_code}")
            logger.error(f"[LLM] 响应内容: {response.text}")
            # 回退到WebSocket方式
            logger.info("[LLM] 尝试使用WebSocket方式")
            return ask_llm_with_websocket(messages, api_key)
        
        full_response = ""  # 存储返回结果
        isFirstContent = True  # 首帧标识
        
        # 处理流式响应
        for chunks in response.iter_lines():
            if chunks and '[DONE]' not in str(chunks):
                try:
                    # 检查是否以 "data: " 开头
                    chunk_str = chunks.decode('utf-8')
                    if chunk_str.startswith('data: '):
                        data_org = chunk_str[6:]  # 跳过 "data: " 前缀
                    else:
                        data_org = chunk_str
                    
                    # 尝试解析JSON
                    chunk = json.loads(data_org)
                    text = chunk['choices'][0]['delta']
                    
                    # 判断最终结果状态并输出
                    if 'content' in text and text['content'] != '':
                        content = text["content"]
                        if isFirstContent:
                            isFirstContent = False
                        logger.info(f"[LLM] 收到内容: {content}")
                        full_response += content
                except Exception as e:
                    logger.error(f"[LLM] 解析响应异常: {e}")
                    logger.error(f"[LLM] 原始数据: {chunks}")
                    continue
        
        logger.info(f"[LLM] HTTP响应完成: {full_response}")
        return {"success": True, "answer": full_response, "source": "http"}
        
    except Exception as e:
        logger.error(f"[LLM] HTTP调用异常: {e}")
        # 回退到WebSocket方式
        logger.info("[LLM] 尝试使用WebSocket方式")
        return ask_llm_with_websocket(messages, api_key)

def ask_llm_with_websocket(messages, api_key):
    """使用WebSocket方式调用大模型API"""
    if not WEBSOCKET_AVAILABLE:
        logger.error("[LLM] WebSocket不可用")
        return {"success": False, "error": "WebSocket不可用", "source": "llm"}
    
    try:
        # 构建WebSocket URL
        wsUrl = assemble_auth_url(requset_url=SPARK_HTTP_URL, method="POST", api_key=api_key, api_secret=SPARK_API_SECRET)
        
        # 创建WebSocket连接
        ws = websocket.create_connection(wsUrl)
        
        # 发送消息
        data = json.dumps(gen_params(SPARK_APPID, messages[-1]["content"]))
        ws.send(data)
        
        # 接收响应
        response_data = ws.recv()
        ws.close()
        
        data = json.loads(response_data)
        code = data['header']['code']
        if code != 0:
            logger.error(f'[LLM] WebSocket请求错误: {code}, {data}')
            return {"success": False, "error": f"WebSocket请求失败: {code}", "source": "websocket"}
        
        choices = data["payload"]["choices"]
        status = choices["status"]
        content = choices["text"][0]["content"]
        logger.info(f"[LLM] 收到内容: {content}")
        
        return {"success": True, "answer": content, "source": "websocket"}
        
    except Exception as e:
        logger.error(f"[LLM] WebSocket调用异常: {e}")
        return {"success": False, "error": str(e), "source": "websocket"}

class ChatHistoryManager:
    """对话历史管理器"""
    def __init__(self):
        self.chat_histories = {}  # 存储不同chat_id的对话历史
    
    def add_message(self, chat_id, role, content):
        """添加消息到对话历史"""
        if chat_id not in self.chat_histories:
            self.chat_histories[chat_id] = []
        
        message = {"role": role, "content": content}
        self.chat_histories[chat_id].append(message)
        
        # 检查长度并截断
        self.chat_histories[chat_id] = checklen(self.chat_histories[chat_id])
    
    def get_messages(self, chat_id):
        """获取对话历史"""
        return self.chat_histories.get(chat_id, [])
    
    def clear_history(self, chat_id):
        """清除对话历史"""
        if chat_id in self.chat_histories:
            del self.chat_histories[chat_id]

# 全局对话历史管理器
chat_manager = ChatHistoryManager()

def send_audio_data(ws, audio_path):
    """发送音频数据到WebSocket"""
    if not WEBSOCKET_AVAILABLE:
        logger.error("[send_audio_data] WebSocket不可用")
        return
    
    try:
        with open(audio_path, "rb") as f:
            count = 0
            status = 0
            headerstatus = 0
            while True:
                data = f.read(1280)  # 每次读取1280字节
                if not data:
                    break
                if count == 0:
                    status = 0
                elif len(data) == 1280:
                    headerstatus = 1
                    status = 1
                else:
                    headerstatus = 1
                    status = 2
                count += 1
                content_b64 = base64.b64encode(data).decode()
                
                data_payload = {
                    "header": {
                        "app_id": SPARK_APPID,
                        "uid": "interview_asr",
                        "status": headerstatus,
                        "stmid": "1",
                        "scene": "sos_app",
                        "msc.lat": 19.65309164062,
                        "msc.lng": 109.259056086,
                        "interact_mode": "continuous_vad"
                    },
                    "parameter": {
                        "iat": {
                            "iat": {
                                "encoding": "utf8",
                                "compress": "raw",
                                "format": "json"
                            },
                        },
                        "nlp": {
                            "nlp": {
                                "encoding": "utf8",
                                "compress": "raw",
                                "format": "json"
                            },
                            "new_session": "global"
                        },
                    },
                    "payload": {
                        "audio": {
                            "status": status,
                            "audio": content_b64,
                            "encoding": "raw",
                            "sample_rate": 16000,
                            "channels": 1,
                            "bit_depth": 16,
                            "frame_size": 0
                        },
                    }
                }
                data_js = json.dumps(data_payload)
                logger.info(f"[ASR] 发送第{count}帧数据")
                ws.send(data_js)
                time.sleep(0.04)
    except Exception as e:
        logger.error(f"[ASR] 发送音频数据异常: {e}")

def recv_asr_data(ws):
    """接收ASR识别结果"""
    global asr_result
    asr_result = ""
    
    while True:
        try:
            result = ws.recv()
            result_js = json.loads(result)
            
            if result_js['header']['code'] == 0 and 'payload' in result_js:
                if 'iat' in result_js['payload']:
                    decoded_bytes = base64.b64decode(result_js['payload']['iat']['text'])
                    decoded_str = decoded_bytes.decode('utf-8')
                    result_js['payload']['iat']['text'] = decoded_str
                    asr_result += decoded_str
                    logger.info(f"[ASR] 识别结果: {decoded_str}")
                elif 'nlp' in result_js['payload']:
                    decoded_bytes = base64.b64decode(result_js['payload']['nlp']['text'])
                    decoded_str = decoded_bytes.decode('utf-8')
                    result_js['payload']['nlp']['text'] = decoded_str
                    logger.info(f"[ASR] NLP结果: {decoded_str}")
                    break
        except Exception as e:
            logger.error(f"[ASR] 接收数据异常: {e}")
            break

def asr_with_llm(audio_path, language="zh_cn"):
    """使用大模型API进行语音识别"""
    if not WEBSOCKET_AVAILABLE:
        logger.error("[asr_with_llm] WebSocket不可用")
        return {"success": False, "error": "WebSocket不可用", "source": "llm"}
    
    try:
        # 检查API配置
        if SPARK_APPID == 'XXXXXXXX' or SPARK_API_SECRET == 'XXXXXXXXXXXXXXXXXXXXXXXX' or SPARK_API_KEY == 'XXXXXXXXXXXXXXXXXXXXXXXX':
            logger.warning("[ASR] 大模型API未配置，回退到原有API")
            return None
        
        logger.info(f"[ASR] 使用大模型API识别音频: {audio_path}")
        
        # 构建认证URL
        path = assemble_auth_url(requset_url=SPARK_ASR_URL, method="GET", api_key=SPARK_API_KEY, api_secret=SPARK_API_SECRET)
        
        # 创建WebSocket连接
        ws = websocket.create_connection(path)
        
        # 创建发送和接收线程
        thread_send = threading.Thread(target=send_audio_data, args=(ws, audio_path))
        thread_recv = threading.Thread(target=recv_asr_data, args=(ws,))
        
        # 启动线程
        thread_recv.start()
        thread_send.start()
        
        # 等待线程完成
        thread_recv.join()
        thread_send.join()
        
        # 关闭连接
        ws.close()
        
        global asr_result
        if asr_result:
            return {"success": True, "text": asr_result, "source": "llm"}
        else:
            return {"success": False, "error": "未识别到文本", "source": "llm"}
            
    except Exception as e:
        logger.error(f"[ASR] 大模型API识别异常: {e}")
        return {"success": False, "error": str(e), "source": "llm"} 