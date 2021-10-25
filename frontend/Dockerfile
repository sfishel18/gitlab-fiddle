FROM node:16-alpine AS webpack

WORKDIR /home
COPY . . 
RUN npm install
ENV API_URL https://api.gitlab-fiddle.com
RUN npm run build

FROM node:16-alpine

EXPOSE 8080
WORKDIR /home
RUN npm install express
COPY server.js server.js
COPY --from=webpack /home/dist/ ./dist
CMD ["node", "server.js"]