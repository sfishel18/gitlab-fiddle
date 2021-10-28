const cors = require('cors');
const express = require('express');
const api = require('./api');

const app = express();

app.use(express.json());
app.use(cors());

app.post('/pipeline', async (req, res, next) => {
    try {
        const { yaml, overrides } = req.body
        const id = await api.createPipeline(yaml, overrides);
        res.status(201).json({ id });
    } catch (error) {
        return next(error)
    }
});

app.get('/pipeline/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const info = await api.getPipeline(id);
        res.json(info);
    } catch (error) {
        return next(error)
    }
});

app.get('/health', (_, res) => res.send({ ok: true }));

app.listen(3000);