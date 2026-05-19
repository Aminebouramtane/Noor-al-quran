

all :
	docker compose down
	docker compose up -d --build


clean :
	docker stop $(docker ps -aq)
	docker rm $(docker ps -aq)
	docker rmi -f $(docker images -aq)
