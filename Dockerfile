ARG NODE_VERSION=14.15.1-alpine

FROM node:${NODE_VERSION} AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

FROM node:${NODE_VERSION} 
USER node
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app
COPY --from=build --chown=node:node  /usr/src/app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src/ ./src/
COPY --chown=node:node app.js ./
EXPOSE 3000
CMD ["npm", "start"]