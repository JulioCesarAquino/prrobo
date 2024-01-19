const express = require('express');

const routes = express.Router();

routes.get('/', (req, res) => res.json({ message: 'PrRobô está ativo!'}));

module.exports = routes;