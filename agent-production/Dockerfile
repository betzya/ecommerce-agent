# 电商客服 Agent 后端镜像
FROM python:3.13-slim

WORKDIR /app

# 先复制依赖清单，利用 Docker 层缓存
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 再复制后端代码
COPY backend ./backend

WORKDIR /app/backend

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
