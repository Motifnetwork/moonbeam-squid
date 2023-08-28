process: migrate
	@node -r dotenv/config lib/processor.js


serve:
	@npx squid-graphql-server


migrate:
	@npx squid-typeorm-migration apply


migration:
	@npx squid-typeorm-migration generate


build:
	@npm run build


codegen:
	@npx squid-typeorm-codegen


typegen: 
	@npx squid-substrate-typegen ./typegen/typegen.json


./typegen/versions.json:
	@make explore


explore:
	@npx squid-substrate-metadata-explorer \
		  --chain wss://wss.api.moonbeam.network \
		  --archive https://moonbeam-beta.indexer.gc.subsquid.io/v4/graphql \
		  --out ./typegen/versions.json


up:
	@docker-compose up -d


down:
	@docker-compose down


.PHONY: process serve start codegen migration migrate up down typegen
