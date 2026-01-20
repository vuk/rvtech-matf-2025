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

U folderu koji sadrži `Dockerfile` prvo treba izgraditi Docker image ukoliko ne postoji, a zatim pokrenuti kontejner:

```bash
# (Opciono) Provera da li image već postoji
$ docker images | grep nodejs-hello-world

# (Opciono) Ako image postoji i želite da ga obrišete pre ponovne izgradnje
# rmi = "remove image" - briše Docker image sa sistema
$ docker rmi nodejs-hello-world

# Izgradnja Docker image-a
# -t = "tag" - označava (imenuje) image sa datim imenom
$ docker build -t nodejs-hello-world .

# (Opciono) Provera da li je image uspešno kreiran
$ docker images | grep nodejs-hello-world

# Pokretanje kontejnera (bez --name, Docker dodeljuje nasumično ime)
$ docker run -p 3000:3000 nodejs-hello-world
```

### Zaustavljanje docker kontejnera

```bash
# Lista svih kontejnera (uključujući zaustavljene)
# Prva kolona prikazuje CONTAINER ID koji možete koristiti za operacije
$ docker ps -a

# Primer izlaza:
# CONTAINER ID   IMAGE                COMMAND                  CREATED          STATUS          PORTS                    NAMES
# b2ed04c89801   nodejs-hello-world   "docker-entrypoint.s…"   2 minutes ago    Up 2 minutes    0.0.0.0:3000->3000/tcp   jolly_hertz

# Zaustavljanje kontejnera koristeći container ID
# stop = zaustavlja pokrenuti kontejner
$ docker stop b2ed04c89801

# Ili koristeći ime kontejnera (ako je dodeljeno sa --name)
$ docker stop jolly_hertz

# Nasilno zaustavljanje kontejnera (ako stop ne radi)
# kill = nasilno prekida kontejner
$ docker kill b2ed04c89801

# Brisanje zaustavljenog kontejnera koristeći container ID
# rm = "remove" - briše kontejner (mora biti zaustavljen)
$ docker rm b2ed04c89801

# Ili koristeći ime kontejnera
$ docker rm nodejs-hello-world

# (Opciono) Automatsko brisanje kontejnera kada se zaustavi
# --rm = automatski briše kontejner kada se zaustavi (ne morate ručno brisati)
$ docker run --rm -p 3000:3000 nodejs-hello-world
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
# Interaktivno pokretanje (foreground) - kontejner se automatski zaustavlja kada izađete (Ctrl+C)
$ docker-compose up --build
```

**Napomena:** Kada pokrenete `docker-compose up` bez `-d` flag-a, kontejner radi interaktivno. Kada pritisnete Ctrl+C ili zatvorite terminal, kontejner se automatski zaustavlja, ali i dalje postoji (nije obrisan). Da biste ga obrisali, koristite `docker-compose down`.

**Napomena:** Docker Compose može pokrenuti više projekata istovremeno. Svaki folder sa `docker-compose.yml` je nezavisan projekat. Docker Compose koristi ime foldera kao ime projekta da razlikuje različite projekte. Možete imati više `docker-compose.yml` fajlova u različitim folderima i svi mogu biti pokrenuti istovremeno.

Zaustavljanje i brisanje resursa pokrenutih kroz `docker-compose up --build`:

**Važno:** Sve komande se izvršavaju u folderu gde se nalazi `docker-compose.yml` i deluju samo na resurse iz tog projekta.

```bash
# Pregled svih kontejnera iz ovog projekta
$ docker-compose ps

# Zaustavljanje svih kontejnera iz ovog projekta (ali ih zadržava)
$ docker-compose stop

# Zaustavljanje i brisanje svih kontejnera i network-a iz ovog projekta
$ docker-compose down

# Zaustavljanje, brisanje kontejnera, network-a i image-a iz ovog projekta
$ docker-compose down --rmi all
```