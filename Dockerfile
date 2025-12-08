FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV production
ENV HOSTNAME "0.0.0.0"
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 965534507674.dkr.ecr.us-east-1.amazonaws.com
docker pull 965534507674.dkr.ecr.us-east-1.amazonaws.com/notbryancannoy:latest
docker stop $(docker ps -q) 2>/dev/null || true
docker run -d -p 80:3000 --restart unless-stopped 965534507674.dkr.ecr.us-east-1.amazonaws.com/notbryancannoy:latest
docker ps
EXPOSE 3000

CMD ["npm", "start"]
