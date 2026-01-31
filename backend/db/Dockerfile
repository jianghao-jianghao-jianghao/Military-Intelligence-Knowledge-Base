FROM postgres:15

ENV DEBIAN_FRONTEND=noninteractive

# 安装必要的依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    make \
    flex \
    bison \
    pkg-config \
    libxml2-dev \
    ca-certificates \
    postgresql-server-dev-15 \
    && rm -rf /var/lib/apt/lists/*

# 安装 pgvector 扩展
RUN git clone --depth 1 https://github.com/pgvector/pgvector.git /tmp/pgvector \
    && cd /tmp/pgvector \
    && make \
    && make install \
    && rm -rf /tmp/pgvector

# 克隆并安装 AGE 扩展
RUN git clone --depth 1 --branch PG15 https://github.com/apache/age.git /tmp/age \
    && cd /tmp/age \
    && make PG_CONFIG=/usr/bin/pg_config install \
    && rm -rf /tmp/age
