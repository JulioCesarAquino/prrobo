const axios = require('axios');

const api = axios.create({
    baseURL: 'https://prbko.pecararabrecho.com.br/api/robo/lpbc/v1',
    timeout: 300000,
    headers: {
        Authorization: 'Bearer d44dfc5cdd7f0748d6c01a646760bca4',
        'Content-Type': "application/json"
    }
});
module.exports = api;
