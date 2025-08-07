# -*- coding:utf-8 -*-
"""
语音识别服务模块
基于讯飞语音识别API
"""

import _thread as thread
import time
import base64
import datetime
import hashlib
import hmac
import json
import ssl
import os
import tempfile
from datetime import datetime
from urllib.parse import urlencode
from wsgiref.handlers import format_date_time
from time import mktime

import websocket
import logging

logger = logging.getLogger(__name__)

STATUS_FIRST_FRAME = 0  # 第一帧的标识
STATUS_CONTINUE_FRAME = 1  # 中间帧标识
STATUS_LAST_FRAME = 2  # 最后一帧的标识


class SpeechRecognitionService:
    """语音识别服务类"""
    
    def __init__(self, app_id, api_key, api_secret):
        self.APPID = app_id
        self.APIKey = api_key
        self.APISecret = api_secret
        self.iat_params = {
            "domain": "slm", 
            "language": "zh_cn", 
            "accent": "mandarin",
            "dwa": "wpgs", 
            "result": {
                "encoding": "utf8",
                "compress": "raw",
                "format": "plain"
            }
        }
        self.recognition_result = ""
        self.websocket = None
        self.is_connected = False

    def create_url(self):
        """生成WebSocket连接URL"""
        url = 'ws://iat.xf-yun.com/v1'
        # 生成RFC1123格式的时间戳
        now = datetime.now()
        date = format_date_time(mktime(now.timetuple()))

        # 拼接字符串
        signature_origin = "host: " + "iat.xf-yun.com" + "\n"
        signature_origin += "date: " + date + "\n"
        signature_origin += "GET " + "/v1 " + "HTTP/1.1"
        
        # 进行hmac-sha256进行加密
        signature_sha = hmac.new(
            self.APISecret.encode('utf-8'), 
            signature_origin.encode('utf-8'),
            digestmod=hashlib.sha256
        ).digest()
        signature_sha = base64.b64encode(signature_sha).decode(encoding='utf-8')

        authorization_origin = "api_key=\"%s\", algorithm=\"%s\", headers=\"%s\", signature=\"%s\"" % (
            self.APIKey, "hmac-sha256", "host date request-line", signature_sha)
        authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode(encoding='utf-8')
        
        # 将请求的鉴权参数组合为字典
        v = {
            "authorization": authorization,
            "date": date,
            "host": "iat.xf-yun.com"
        }
        # 拼接鉴权参数，生成url
        url = url + '?' + urlencode(v)
        return url

    def on_message(self, ws, message):
        """收到websocket消息的处理"""
        try:
            message = json.loads(message)
            code = message["header"]["code"]
            status = message["header"]["status"]
            
            if code != 0:
                logger.error(f"语音识别请求错误：{code}")
                ws.close()
            else:
                payload = message.get("payload")
                if payload:
                    text = payload["result"]["text"]
                    text = json.loads(str(base64.b64decode(text), "utf8"))
                    text_ws = text['ws']
                    result = ''
                    for i in text_ws:
                        for j in i["cw"]:
                            w = j["w"]
                            result += w
                    self.recognition_result += result
                    logger.info(f"语音识别结果: {result}")
                
                if status == 2:
                    ws.close()
                    self.is_connected = False
        except Exception as e:
            logger.error(f"处理语音识别消息时出错: {e}")

    def on_error(self, ws, error):
        """收到websocket错误的处理"""
        logger.error(f"语音识别WebSocket错误: {error}")
        self.is_connected = False

    def on_close(self, ws, close_status_code, close_msg):
        """收到websocket关闭的处理"""
        logger.info("语音识别WebSocket连接已关闭")
        self.is_connected = False

    def on_open(self, ws):
        """收到websocket连接建立的处理"""
        def run(*args):
            frameSize = 1280  # 每一帧的音频大小
            intervel = 0.04  # 发送音频间隔(单位:s)
            status = STATUS_FIRST_FRAME  # 音频的状态信息，标识音频是第一帧，还是中间帧、最后一帧

            with open(self.audio_file_path, "rb") as fp:
                while True:
                    buf = fp.read(frameSize)
                    audio = str(base64.b64encode(buf), 'utf-8')

                    # 文件结束
                    if not buf:
                        status = STATUS_LAST_FRAME
                    
                    # 第一帧处理
                    if status == STATUS_FIRST_FRAME:
                        d = {
                            "header": {
                                "status": 0,
                                "app_id": self.APPID
                            },
                            "parameter": {
                                "iat": self.iat_params
                            },
                            "payload": {
                                "audio": {
                                    "audio": audio, 
                                    "sample_rate": 16000, 
                                    "encoding": "raw"
                                }
                            }
                        }
                        d = json.dumps(d)
                        ws.send(d)
                        status = STATUS_CONTINUE_FRAME
                    
                    # 中间帧处理
                    elif status == STATUS_CONTINUE_FRAME:
                        d = {
                            "header": {
                                "status": 1,
                                "app_id": self.APPID
                            },
                            "parameter": {
                                "iat": self.iat_params
                            },
                            "payload": {
                                "audio": {
                                    "audio": audio, 
                                    "sample_rate": 16000, 
                                    "encoding": "raw"
                                }
                            }
                        }
                        ws.send(json.dumps(d))
                    
                    # 最后一帧处理
                    elif status == STATUS_LAST_FRAME:
                        d = {
                            "header": {
                                "status": 2,
                                "app_id": self.APPID
                            },
                            "parameter": {
                                "iat": self.iat_params
                            },
                            "payload": {
                                "audio": {
                                    "audio": audio, 
                                    "sample_rate": 16000, 
                                    "encoding": "raw"
                                }
                            }
                        }
                        ws.send(json.dumps(d))
                        break

                    # 模拟音频采样间隔
                    time.sleep(intervel)

        thread.start_new_thread(run, ())

    def recognize_speech(self, audio_file_path):
        """识别语音文件"""
        try:
            self.audio_file_path = audio_file_path
            self.recognition_result = ""
            self.is_connected = True
            
            websocket.enableTrace(False)
            wsUrl = self.create_url()
            self.websocket = websocket.WebSocketApp(
                wsUrl, 
                on_message=self.on_message, 
                on_error=self.on_error, 
                on_close=self.on_close
            )
            self.websocket.on_open = self.on_open
            self.websocket.run_forever(sslopt={"cert_reqs": ssl.CERT_NONE})
            
            return self.recognition_result.strip()
        except Exception as e:
            logger.error(f"语音识别失败: {e}")
            return ""

    def recognize_audio_data(self, audio_data):
        """识别音频数据"""
        try:
            # 创建临时文件
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pcm') as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name
            
            # 进行语音识别
            result = self.recognize_speech(temp_file_path)
            
            # 删除临时文件
            os.unlink(temp_file_path)
            
            return result
        except Exception as e:
            logger.error(f"识别音频数据失败: {e}")
            return ""


# 创建全局语音识别服务实例
speech_service = None

def init_speech_service(app_id, api_key, api_secret):
    """初始化语音识别服务"""
    global speech_service
    speech_service = SpeechRecognitionService(app_id, api_key, api_secret)
    logger.info("语音识别服务初始化成功")

def get_speech_service():
    """获取语音识别服务实例"""
    return speech_service 