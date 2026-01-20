### Pokretanje LocalStack-a

**Važno:** Pre korišćenja LocalStack-a, potrebno je pokrenuti LocalStack kontejner:

```bash
# Pokretanje LocalStack-a u pozadini
$ docker-compose up -d

# Provera da li je LocalStack pokrenut
$ docker-compose ps
```

### Kreiranje Lambda funkcije

**Napomena:** `awslocal` ne kreira template fajlove - potrebno je ručno kreirati kod funkcije.

**JavaScript/Node.js template (`index.js`):**
```javascript
exports.handler = async (event) => {
  return "Hello World!";
}
```

**Python template (`index.py`):**
```python
def handler(event, context):
    return "Hello, World! From Python"
```

### Izlistaj sve Lambda funkcije u LocalStack-u
awslocal lambda list-functions

### Dodavanje nove JavaScript Lambda funkcije u LocalStack
Prvo je potrebno da zipujemo nasu funkciju `zip function.zip index.js`

Koriscenjem awslocal skripte (ova komanda kreira Lambda funkciju u LocalStack-u i uploaduje kod iz zip fajla):
```
awslocal lambda create-function \
--function-name hello-world \
--runtime nodejs18.x \
--handler index.handler \
--zip-file fileb://function.zip \
--role arn:aws:iam::000000000000:role/lambda-role
```

**Objašnjenje parametara:**
- `--function-name` - ime Lambda funkcije u LocalStack-u
- `--runtime` - runtime okruženje (nodejs18.x, python3.11, itd.)
- `--handler` - ime funkcije koja će biti pozvana (index.handler = funkcija handler u index.js)
- `--zip-file` - putanja do zip fajla sa kodom funkcije
- `--role` - IAM role (u LocalStack-u koristimo placeholder ARN)

### Pokreni dodatu funkciju iz LocalStack-a
`awslocal lambda invoke --function-name hello-world /dev/stdout`

### Izmeni kod vec postojece Lambda funkcije u LocalStack-u
Prvo je potrebno da zipujemo nasu funkciju `zip function.zip index.js`
```
awslocal lambda update-function-code \
--function-name hello-world \
--zip-file fileb://function.zip
```
### Obrisi Lambda funkciju iz LocalStack-a
`awslocal lambda delete-function --function-name hello-world`

### Dodavanje nove Python Lambda funkcije u LocalStack
```
awslocal lambda create-function \
--function-name hello-world-python \
--runtime python3.11 \
--handler index.handler \
--zip-file fileb://function.zip \
--role arn:aws:iam::000000000000:role/lambda-role
```

