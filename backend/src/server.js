const cors = require('cors');
const express = require('express');
const api = require('./api');

const app = express();

app.use(express.json());
app.use(cors());

app.post('/pipeline', async (req, res, next) => {
    try {
        const { yaml, overrides } = req.body
        const ref = await api.createPipeline(yaml, overrides);
        res.status(201).json({ id: ref });
    } catch (error) {
        return next(error)
    }
});

app.get('/pipeline/:ref', async (req, res, next) => {
    try {
        const { ref } = req.params;
        const info = await api.getPipeline(ref);
        res.json(info);
    } catch (error) {
        return next(error)
    }
});

app.put('/pipeline/:ref', async (req, res, next) => {
    try {
        const { ref } = req.params;
        const { yaml, overrides } = req.body
        await api.updatePipeline(ref, yaml, overrides);
        res.status(201).json({ id: ref });
    } catch (error) {
        return next(error)
    }
});

app.get('/health', (_, res) => res.send({ ok: true }));

app.listen(3000);