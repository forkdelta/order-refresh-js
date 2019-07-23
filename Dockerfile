FROM node:12-alpine

RUN apk add --update --upgrade --no-cache git # Need this while we have git-based npm deps

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json yarn.lock /usr/src/app/
RUN yarn install --frozen-lockfile

COPY . /usr/src/app

USER nobody
EXPOSE 3000
CMD ["npx", "micro"]
