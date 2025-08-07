import base64
import hashlib
import hmac
import json
import os
import threading
import time

from datetime import datetime
from time import mktime 
from urllib.parse import urlencode
from wsgiref.handlers import format_date_time
from websocket import create_connection


#以下为接口调用校验的三元组信息，获取地址：https://console.xfyun.cn/services/VCN  （如果未在开放平台创建应用，请先创建）

app_id = "82e7fa93"
Key = "ZDc4NjkyMjVhOGRlYWJiYmM3OWM1NDgy"
Secret = "891ffce5b4b74fd82c3dbb65203c7614"
scene="sos_app" # 默认固定值

#音频文件位置
# 音频需要保留足够长的静音段，比如 10s 的音频中，说话部分只在前 2s，用来模拟全双工持续不断的传音频场景
# 音频最好是原始的 raw 格式，wav 也可；不可是其他压缩格式，demo 代码未做压缩编码适配
input_file = r"天气16K.wav"
audio_file_path = r"./"


# base_url = "wss://sparkos.xfyun.cn/v3/sos"
base_url = "ws://sparkos.xfyun.cn/v1/openapi/chat"
audio_array = ""
class AssembleHeaderException(Exception):
    def __init__(self, msg):
        self.message = msg


class Url:
    def __init__(this, host, path, schema):
        this.host = host
        this.path = path
        this.schema = schema
        pass


# calculate sha256 and encode to base64
def sha256base64(data):
    sha256 = hashlib.sha256()
    sha256.update(data)
    digest = base64.b64encode(sha256.digest()).decode(encoding='utf-8')
    return digest


def parse_url(requset_url):
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


# build  auth request url
def assemble_auth_url(requset_url, method="GET", api_key="", api_secret=""):
    u = parse_url(requset_url)
    host = u.host
    path = u.path
    now = datetime.now()
    date = format_date_time(mktime(now.timetuple()))
    # print(date)
    # date = "Thu, 12 Dec 2019 01:57:27 GMT"
    signature_origin = "host: {}\ndate: {}\n{} {} HTTP/1.1".format(host, date, method, path)
    # print(signature_origin)
    signature_sha = hmac.new(api_secret.encode('utf-8'), signature_origin.encode('utf-8'),
                             digestmod=hashlib.sha256).digest()
    signature_sha = base64.b64encode(signature_sha).decode(encoding='utf-8')
    authorization_origin = "api_key=\"%s\", algorithm=\"%s\", headers=\"%s\", signature=\"%s\"" % (
        api_key, "hmac-sha256", "host date request-line", signature_sha)
    authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode(encoding='utf-8')
    # print(authorization_origin)
    values = {
        "host": host,
        "date": date,
        "authorization": authorization
    }

    return requset_url + "?" + urlencode(values)

def send_data(ws):
        with open(input_file,"rb") as f:
            # stmid = 0
            count = 0
            status = 0
            headerstatus= 0
            while True:
                data = f.read(1280)  # 每次读取1280字节
                if not data:
                    break  # 如果没有数据了，跳出循环，# 暂不考虑音频大小是 1280 的倍数
                if count == 0:
                    status = 0
                elif len(data) == 1280: # 暂不考虑音频大小是 1280 的倍数
                    headerstatus = 1
                    status = 1
                else:
                    headerstatus = 1
                    status = 2
                    # time.sleep(4)
                count += 1
                content_b64 = base64.b64encode(data).decode()
                data = {
                    "header": {
                        "app_id": app_id,
                        "uid": "youtestuid",
                        "status": headerstatus,
                        "stmid": "1",
                        # "stmid": str(count),
                        "scene": "sos_app",
                        "msc.lat": 19.65309164062,
                        "msc.lng": 109.259056086,
                        # "ver_type": "test_demo",
                        # "os_sys": "android",
                        "interact_mode":"continuous_vad"   # continuous_vad 单工模式，  continuous 全双工模式
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
                        "tts": {
                            # "vcn": "x5_lingfeiyi_flow",    # 成年男：男性助理场景
                            "vcn": "x5_lingxiaoyue_flow",   #  成年女：女性助理场景
                            "speed": 50,
                            "volume": 50,
                            "pitch": 50,
                            "tts": {
                                # "encoding": "raw",
                                "encoding": "lame",
                                "sample_rate": 16000,
                                "channels": 1,
                                "bit_depth": 16,
                                "frame_size": 0
                            }
                    },
                },
                "payload": {
                    "audio": {
                        "status": status,
                        "audio": content_b64,
                        "encoding": "raw",
                        # "encoding": "lame",
                        "sample_rate": 16000,
                        "channels": 1,
                        "bit_depth": 16,
                        "frame_size": 0
                    },
            }
    }
                data_js = json.dumps(data)
                print("发送第" +str(count) +"帧数据：" ,data_js)
                ws.send(data_js)
                time.sleep(0.04)

def recv_data(ws):
    # 加载音频文件
    audio_array = []
    # with open('output.pcm', 'wb') as f:
    while True:
        result = ws.recv()
        result_js = json.loads(result)
        # print(result_js)
        if(result_js['header']['code'] == 0 and 'payload' in result_js ):
            if 'event' in result_js['payload']:
                decoded_bytes = base64.b64decode(result_js['payload']['event']['text'])
                decoded_str = decoded_bytes.decode('utf-8')
                result_js['payload']['event']['text'] = decoded_str
            elif 'iat' in result_js['payload']:
                decoded_bytes = base64.b64decode(result_js['payload']['iat']['text'])
                decoded_str = decoded_bytes.decode('utf-8')
                result_js['payload']['iat']['text'] = decoded_str
            elif 'nlp' in result_js['payload']:
                decoded_bytes = base64.b64decode(result_js['payload']['nlp']['text'])
                decoded_str = decoded_bytes.decode('utf-8')
                result_js['payload']['nlp']['text'] = decoded_str
            elif 'tts' in result_js['payload']:
                if len(result_js['payload']['tts']['audio']) > 0:
                    audio_bytes = base64.b64decode(result_js['payload']['tts']['audio'])
                    audio_array.append(audio_bytes)
                try:
                    status = result_js["payload"]["tts"]["status"]
                    if status == 2:
                        print("开始写音频")
                        writeAudioFile(audio_array)
                        break
                except:
                    pass
            # print(str(result_js))
            # 将解码后的数据写入到本地文件


def writeAudioFile(audio_array):
    time_now = str(int(time.time()))
    file_name = audio_file_path+time_now+".mp3"
    print(file_name)
    fp = open(file_name, "wb+")
    try:
        for audio in audio_array:
            fp.write(audio)
    finally:
        fp.flush()
        fp.close()


if __name__ == '__main__':
    path = assemble_auth_url(requset_url=base_url, method="GET", api_key=Key, api_secret=Secret)
    ws = create_connection(path)
    thread_send = threading.Thread(target=send_data, args=(ws,))
    thread_recv = threading.Thread(target=recv_data, args=(ws,))
    thread_recv.start()
    thread_send.start()
    thread_recv.join()
    thread_send.join()