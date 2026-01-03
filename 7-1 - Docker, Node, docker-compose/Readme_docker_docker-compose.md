### Instalacija docker-a

Instalacija `docker desktop` se moze obaviti putem software centra na Ubuntu Linux-u ili putem instrukcija na [sajtu docker-a](https://docs.docker.com/desktop/setup/install/linux/)

Nakon instalacije pokrenite funkciju koja izlistava aktivne kontejnere: 

```bash 
$ docker ps -a
```

### Osnovni `Dockerfile`

Osnovni `Dockerfile` sadrži minimalnu konfiguraciju za pokretanje minimalne node aplikacije u docker container-u

```Dockerfile
# Osnovni image na osnovu koga kreiramo naš image
FROM node:22

# Postavljanje radnog direktorijuma
WORKDIR /app

# Kopiramo package.json (definiciju node projekta i njegovih zavisnosti) i package-lock.json ako postoji u kontejner
COPY package*.json ./

# Instalacija zavisnosti projekta
RUN npm install

# Kopiramo aplikativni kod (u našem slučaju jedino relevantno je index.js)
COPY . .

# Pošto smo u index.js definisali da se aplikacija pokreće na portu 3000, ovaj port moramo otvoriti i u kontejneru
EXPOSE 3000

# Pokrećemo aplikaciju sa njegovom ulaznom tačkom
CMD ["node", "index.js"]

```

### Pokretanje docker aplikacije

U folderu koji sadrži `Dockerfile` treba pokrenuti komandu 

```bash
$ docker run -p 3000:3000 nodejs-hello-world 
```

### Pokretanje aplikacije kroz `docker-compose`

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    container_name: nodejs-hello-world
    restart: unless-stopped

  database: 
    ...

  queue: 
    ...

  localstack: 
    ...

```

Kroz `docker-compose.yml` definišemo servise koje želimo da pokrenemo kao i načine njihove mrežne komunikacije i javne dostupnosti. 

Kontejnere definisane u `docker-compose.yml` pokrećemo komandom: 

```bash 
$ docker-compose up --build
```