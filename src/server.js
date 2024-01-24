const express = require('express');
const date = require('node-datetime');
const routes = require('./routes/routes');
const fornecedorController = require('./controller/fornecedorController');
const nfeController = require('./controller/nfeController');
const produtosRecController = require('./controller/produtosRecController');
const config =  require('./function/config');
const Service = require('node-windows').Service;

const app = express();

app.use(routes);
app.use(express.json());


const svc = new Service({
    name: 'PR Robo',
    description: 'Envio e recebimento de dados',
    script: './src/server.js'
});

svc.on('install', function (){
    svc.start();
});

svc.install();



//Verifica o fornecedor a cada 15 segundos.

setInterval(() => {
    fornecedorController.consultarFornecedorApi();
}, 15000);

//Verifica NFe a cada 10 segundos.

setInterval(() => {
    nfeController.consultarVendas().then(vendas => {

        return nfeController.enviarNFe(vendas);
    });
}, 30000);

//Verifica o produto a cada 30 segundos.

setInterval(() => {

    produtosRecController.buscarProdutosApi().then(resul => {

        produtosRecController.validarProdutosLocal(resul);

    });

}, 30000);

setInterval(() => {

    let df = date.create();
    let horas = df.format('H:M');
    let dataDeHoje = df.format('Y-m-d');
    let lastDay = config.ultimoDiaDoMesAtual()
    let UltimaDataMes = lastDay.split(' ')[0]

    if(horas == '14:40'){

        config.alterarConfiNF();

    }

    if(horas == '19:15'){

        config.alterarConfiNF();

    }

    if(horas == '22:15'){

        config.alterarConfiNF();

    }
    if (horas == '23:40') {
        // Altera a data de sincronização para o início do dia
        config.alterarConfiNF();
        nfeController.contaVendaDia();
    }
        // Executa a sincronização mensal no último dia do mês
    if(UltimaDataMes == dataDeHoje && horas == '23:50'){
        nfeController.contaVendaDia(config.primeiroDiaDoMesAtual());
    }

}, 25000);


app.listen(3333);