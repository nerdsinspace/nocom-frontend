FROM node:12-buster AS build

ENV NPM_CONFIG_CACHE=/opt/nocom-frontend/.npm

WORKDIR /opt/work
COPY . /opt/work

RUN npm install --verbose
RUN npm run ng build -- --prod --output-path=dist

FROM nginx:stable AS nginx

RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /opt/work/dist/ /usr/share/nginx/html/

RUN ln -sf /dev/stdout /var/log/nginx/access.log
RUN ln -sf /dev/stderr /var/log/nginx/error.log

VOLUME /etc/nginx/conf.d/
VOLUME /var/cache/nginx/

CMD ["nginx", "-g", "daemon off;"]
