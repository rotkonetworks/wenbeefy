# Stage 1: Build Brotli module for Nginx
FROM nginx:alpine as nginx-builder

# Install build dependencies
RUN apk update \
    && apk add --no-cache git gcc libc-dev make openssl-dev pcre-dev zlib-dev linux-headers \
    && apk add brotli brotli-dev

# Create directories for building Nginx
RUN mkdir -p /usr/src \
    && mkdir -p /usr/lib/nginx/modules

# Download Nginx source and compile Brotli module
RUN cd /usr/src \
    && wget https://nginx.org/download/nginx-1.25.3.tar.gz \
    && tar -zxf nginx-1.25.3.tar.gz \
    && git clone https://github.com/google/ngx_brotli.git \
    && cd ngx_brotli && git submodule update --init \
    && cd /usr/src/nginx-1.25.3 \
    && ./configure --with-compat --add-dynamic-module=../ngx_brotli \
    && make modules \
    && cp objs/ngx_http_brotli_filter_module.so /usr/lib/nginx/modules/ \
    && cp objs/ngx_http_brotli_static_module.so /usr/lib/nginx/modules/

# Stage 2: Final Nginx with Brotli
FROM nginx:alpine

# Install runtime dependencies for Brotli
RUN apk add --no-cache brotli brotli-dev

# Copy Nginx configuration files and modules from the builder stage
COPY --from=nginx-builder /usr/lib/nginx/modules /usr/lib/nginx/modules

# Copy Nginx configuration files from host
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80 for HTTP traffic
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
