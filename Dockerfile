FROM nginx:1.19

RUN rm -rf /usr/share/nginx/html/*
COPY dist /usr/share/nginx/html

RUN ln -sf /dev/stdout /var/log/nginx/access.log
RUN ln -sf /dev/stderr /var/log/nginx/error.log

VOLUME /etc/nginx/conf.d/
VOLUME /var/cache/nginx/

CMD ["nginx", "-g", "daemon off;"]
