
FROM node:lts
ARG ROOT=/app
RUN mkdir -p $ROOT
COPY . $ROOT
WORKDIR $ROOT
VOLUME $ROOT

CMD ["npm", "run", "dev"]
