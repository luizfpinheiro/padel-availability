copy:
	cp -r react-app/dist/* .

build:
	cd react-app && npm run build

deploy: build copy
