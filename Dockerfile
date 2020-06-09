#FROM node:14-alpine as build
#
#COPY package.json package-lock.json ./
#
#RUN npm ci && mkdir /opt/app && mv node_modules /opt/app
#
#WORKDIR /opt/app
#
#COPY . .
#
#RUN npm run ng build -- --prod --output-path=dist

FROM nginx:1.19 as serve

COPY nginx/default.conf /etc/nginx/conf.d/

RUN rm -rf /usr/share/nginx/html/*

COPY dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
