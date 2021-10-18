FROM node:16-alpine

EXPOSE 3000

RUN apk update && apk upgrade && apk add --no-cache bash git openssh
WORKDIR /home
COPY . . 
RUN npm install --production

CMD ["node", "src/server.js"]