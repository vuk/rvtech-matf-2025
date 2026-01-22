# Instrukcije za podešavanje i deploy projekta

## Preduslovi

- Docker i Docker Compose instalirani
- Node.js i npm instalirani

## 1. Očisti Docker okruženje

Pre početka, očisti postojeći LocalStack kontejner ako je pokrenut:

```bash
# Pronađi ID LocalStack kontejnera
docker ps -a

# Zaustavi specifični LocalStack kontejner (zameni CONTAINER_ID stvarnim ID-jem)
docker stop CONTAINER_ID

# Ukloni specifični kontejner
docker rm CONTAINER_ID

```

## 2. Pokreni LocalStack sa Docker Compose

Pokreni LocalStack za simulaciju AWS servisa lokalno:

```bash
# Pokreni LocalStack u detached režimu
docker-compose up -d

# Proveri da li LocalStack radi
docker ps

```

Ako `docker-compose` komanda nije pronađena, pokušaj `docker compose`.

LocalStack će biti dostupan na `http://localhost:4566`

## 3. Deploy Serverless konfiguracije

Deploy-uj serverless funkcije na LocalStack:

```bash
# Instaliraj serverless dependencije
npm install

# Deploy na LocalStack
npx serverless deploy
```

**Napomena:** `npx serverless` koristi lokalnu verziju serverless-a iz `node_modules`. Ako imaš globalno instaliran `serverless`, možeš koristiti samo `serverless deploy`, ali `npx` osigurava da se koristi verzija iz projekta.

Ovo će deploy-ovati Lambda funkcije, API Gateway i ostale AWS resurse na LocalStack.

### Provera deploy-ovanih resursa

Nakon deploy-a, proveri da li su resursi uspešno kreirani:

```bash
# Proveri Lambda funkcije
awslocal lambda list-functions --region us-east-1

# Proveri S3 bucket-e
awslocal s3 ls --region us-east-1

# Proveri API Gateway REST API-je (dobijaš ID za endpoint URL)
awslocal apigateway get-rest-apis --region us-east-1

# Proveri DynamoDB tabele
awslocal dynamodb list-tables --region us-east-1
```

### Dobijanje REST API endpoint URL-a

```bash
# Automatsko dobijanje endpoint URL
awslocal apigateway get-rest-apis --region us-east-1 --query 'items[0].id' --output text | xargs -I {} echo "http://localhost:4566/restapis/{}/dev/_user_request_/chargers"
```

**Format API Gateway URL-a:**
```
http://localhost:4566/restapis/{REST_API_ID}/dev/_user_request_/{path}
```

Gde je:
- `{REST_API_ID}` - ID REST API-ja (dobijaš sa `get-rest-apis`)
- `dev` - stage name (iz serverless.yml ili default-ni)
- `{path}` - path funkcije (npr. `chargers` iz serverless.yml)

## 4. Deploy statičkog sajta na S3

Otpremi fajlove statičkog veb sajta u S3 bucket:

```bash
# Sinhronizuj statičke fajlove sa S3 bucket-om
awslocal s3 sync ./web s3://punjaci-website
```

## 5. Pristupi aplikaciji

- **API Endpoints**: Proveri serverless deploy izlaz za API Gateway URL-ove
  ![alt text](docs/image.png)

  - koristi `endpoint` url i dodaj putanju za svoju funkciju, npr. `/chargers`
  - Primer: [http://localhost:4566/restapis/njwtb39abc/dev/_user_request_/chargers](http://localhost:4566/restapis/njwtb39abc/dev/_user_request_/chargers)

- **S3 Website**: [http://punjaci-website.s3-website.localhost.localstack.cloud:4566](http://punjaci-website.s3-website.localhost.localstack.cloud:4566)
  - Format: `http://{bucket-name}.s3-website.localhost.localstack.cloud:4566`

## 6.(Opciono) Prijaviš se na Localstack veb sajt da pristupiš Localstack UI

- [https://app.localstack.cloud/sign-in](https://app.localstack.cloud/sign-in)
- Klikni na dostupnu instancu levo, i izaberi `Status` tab da vidiš pokrenute servise
  ![alt text](docs/image-1.png)
