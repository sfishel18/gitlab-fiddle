const express = require('express');

const app = express();

app.use(express.static('dist'));

app.get('/health', (_, res) => res.send({ ok: true }));

app.listen(8080);