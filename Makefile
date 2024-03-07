compose = docker compose

up: build
	${compose} up -d
build:
	${compose} build backend
down:
	${compose} down
redeploy:
	${compose} pull && make up


