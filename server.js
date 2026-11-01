
const express = require('express');
const pool = require('./src/db.js').pool;
const { auth } = require('express-openid-connect');
const QrCode = require('qrcode');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const externalURL = process.env.RENDER_EXTERNAL_URL;
const port = externalURL && process.env.PORT ? parseInt(process.env.PORT) : 8080;
const baseURL = externalURL || `http://localhost:${port}`;

const config = {
    authRequired: false,
    idpLogout: true,
    secret: process.env.AUTH0_WEB_SESSION_SECRET,
    baseURL: baseURL,
    clientID: process.env.client_id,
    issuerBaseURL: process.env.authority,
    clientSecret: process.env.client_secret,

    authorizationParams: {
        response_type: 'code',
        audience: process.env.audience,
        scope: 'openid profile email create:passes read:passes'
    },

    routes: {
        callback: '/callback',
    },
};

app.use(auth(config));

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.oidc.isAuthenticated();
    res.locals.user = req.oidc.user;
    res.locals.accessToken = req.oidc.accessToken?.access_token;
    next();
});

app.use(express.json());

app.use(express.static('public'));

app.set('view engine', 'ejs');
app.set('views', './views');

const passesRouter = require('./src/routes/passes.js');
app.use('/passes', passesRouter);

const manageRouter = require('./src/routes/manage.js');
app.use('/manage', manageRouter);

app.get('/', async (req, res) => {
    try {
        const AllPasses = await pool.query(`
            SELECT
                COUNT(*)::int AS total_passes,
                COUNT(*) FILTER (
                    WHERE status = 'ACTIVE'
                )::int AS active_passes
            FROM passes
        `);

        const isAuthenticated = req.oidc.isAuthenticated();
        let passes = [];

        if (isAuthenticated) {
            const UserPasses = await pool.query(
                `SELECT * FROM passes ORDER BY issuedAt DESC`
            );
            passes = UserPasses.rows;
        }

        const totalPasses = AllPasses.rows[0].total_passes;
        const activePasses = AllPasses.rows[0].active_passes;

        res.render('home', {
            totalPasses,
            activePasses,
            passes,
        });

    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/info/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT * FROM passes WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Propusnica s tim identifikatorom ne postoji' });
        }

        const pass = result.rows[0];
        const png = await QrCode.toDataURL(`${baseURL}/info/${id}`, { type: 'png' });
        
        return res.status(200).render('passes', { pass, png });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
