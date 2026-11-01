const express = require('express');
const router = express.Router();
const pool = require('../db.js').pool
const { checkJwt, requiredScopes } = require('../middleware/auth.js');
const QrCode = require('qrcode');
const externalURL = process.env.RENDER_EXTERNAL_URL;
const port = externalURL && process.env.PORT ? parseInt(process.env.PORT) : 8080;
const baseURL = externalURL || `http://localhost:${port}`;

router.post('/', checkJwt, requiredScopes('create:passes'), async (req, res) => {
    const name = req.body.name;
    const document = req.body.document;
    if (
        typeof name !== 'string' ||
        !name.trim() ||
        typeof document !== 'string' ||
        !document.trim()
    ) {
        return res.status(400).json({ error: 'Ime ili dokument su prazni' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO passes (name, document)
             VALUES ($1, $2) 
             RETURNING *`,
            [name.trim(), document.trim()]
        );

        const id = result.rows[0].id;
        //const png = await QrCode.toBuffer(`https://localhost:8080/${id}`, { type: 'png' });
        const png = await QrCode.Buffer(`${baseURL}/info/${id}`, { type: 'png' });

        res.set('Location', `${baseURL}/passes/${id}`);
        //res.set('Location', `https://localhost:8080/passes/${id}`);
        res.set('Content-Type', 'image/png');

        return res.status(201).send(png);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id', checkJwt, requiredScopes('read:passes'), async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(
            `SELECT * FROM passes WHERE id = $1`,
            [id]
        );
        if(result.rows.length === 0) {
            return res.status(404).json({ error: 'Propusnica s tim identifikatorom ne postoji' });
        }
        return res.status(200).json(result.rows[0]);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;