const { response } = require('express');
const api = require('../function/apiConnection');
const config = require('../function/config');

module.exports = {
    async respostaApi(Produto){

        const loja = await config.consultaLoja();

        await api.patch(`/sync/nf/entrada/${loja}`, Produto).then(response => {

            console.log("Cod.: ", + Produto.CdProduto, " cadastrado!");

        }).catch(erro => {

            console.log("Erro ao retorna informações para a API!");

        });
    }
}