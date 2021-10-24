FROM node:16-alpine

ARG SSH_KEY
ARG SSH_KNOWN_HOSTS

EXPOSE 3000

RUN apk update && apk upgrade && apk add --no-cache bash git openssh
RUN mkdir /root/.ssh
RUN echo "$SSH_KEY" >> /root/.ssh/id_rsa
RUN chmod 400 /root/.ssh/id_rsa
RUN echo "$SSH_KNOWN_HOSTS" >> /root/.ssh/known_hosts

WORKDIR /home
COPY . . 
RUN npm install --production

CMD ["node", "src/server.js"]