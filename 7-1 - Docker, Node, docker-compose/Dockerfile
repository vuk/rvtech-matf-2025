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