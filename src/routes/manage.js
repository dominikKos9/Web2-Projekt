const express = require('express');
const pool = require('../db.js').pool

const router = express.Router();

function requireLogin(req, res, next) {
    if (!req.oidc.isAuthenticated()) {
        return res.redirect('/login');
    }
    next();
}


router.post('/passes/:id/cancel', requireLogin, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `UPDATE passes SET status = 'CANCELLED' WHERE id = $1 RETURNING *`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Propusnica s tim identifikatorom ne postoji' });
        }
        return res.redirect('/');
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/passes/:id/delete', requireLogin, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM passes WHERE id = $1 RETURNING *`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Propusnica s tim identifikatorom ne postoji' });
        }
        return res.redirect('/');
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;