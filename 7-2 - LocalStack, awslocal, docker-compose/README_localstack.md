### Izlistaj sve Lambda funkcije u LocalStack-u
awslocal lambda list-functions

### Dodavanje nove JavaScript Lambda funkcije u LocalStack
First zip the function `zip function.zip index.js`

Koriscenjem awslocal skripte
```
awslocal lambda create-function \
--function-name hello-world \
--runtime nodejs18.x \
--handler index.handler \
--zip-file fileb://function.zip \
--role arn:aws:iam::000000000000:role/lambda-role
```

### Pokreni dodatu funkciju iz LocalStack-a
`awslocal lambda invoke --function-name hello-world /dev/stdout`

### Izmeni kod vec postojece Lambda funkcije u LocalStack-u
First zip the updated function `zip function.zip index.js`
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

