FROM pgvector/pgvector:pg16

COPY docker/postgres/init/ /docker-entrypoint-initdb.d/
COPY supabase/migrations/ /migrations/
COPY supabase/seed.sql /seed/seed.sql

RUN sed -i 's/\r$//' /docker-entrypoint-initdb.d/*.sh \
  && chmod +x /docker-entrypoint-initdb.d/*.sh
