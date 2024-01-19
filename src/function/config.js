const sql = require("mssql");
const date = require('node-datetime');
const fs = require('fs');

module.exports = {

    async conexaoSQL() {
        const conexão = 'mssql://sa:PoliSystemsapwd@localhost/PoliSystemServerSQLDB';

        return conexão;
    },

    async consultaLoja() {

        try {

            await sql.connect('mssql://sa:PoliSystemsapwd@localhost/PoliSystemServerSQLDB');

            const CNPJLoja = await sql.query("SELECT CNPJEmpresa FROM EMPRESA WHERE (CdEmpresa = 1)");

            const [{ CNPJEmpresa: cnpj }] = CNPJLoja.recordset;
            const loja = cnpj.normalize().replace(/([\u0300-\u036f]|[^0-9a-zA-Z])/g, '');


            return loja;

        } catch (erroAoConsultarCNPJ) {

            console.log("Erro ao consultar loja.", erroAoConsultarCNPJ);
        }
    },

    registrarLogs(prefixo, menssagem) {

        const df = date.create();
        let dataLog = df.format('Y-m-d');
        let horaLog = df.format('H:M:S');

        let diretorio = `${prefixo}-${dataLog}.txt`;
        let conteudo = `[${horaLog}] - ${menssagem}`;

        fs.appendFile(diretorio, conteudo, (errorAoLerArquivo) => {
            if (errorAoLerArquivo) {
                console.log(`Arquivo ${diretorio} NÃO configurado!`);
            }
        });

    },

    gerarLog(diretorio, conteudoDoArquivo) {

        const df = date.create();
        const formatDate = df.format('Y-m-d-HMS');

        fs.writeFile(`${diretorio}-${formatDate}.txt`, `${conteudoDoArquivo}`, (errorNaEscrita) => {
            if (errorNaEscrita) {

                console.log("Erro ao gerar um log: " + diretorio + errorNaEscrita);

            } else {

                console.log(`Log gerado no diretorio:  ${diretorio}!`);

            }
        });
    },
    /**
    * Essa função modifica o arquivo NFeConfig para 00:00:00 da data informada ou data atual caso não informe.
    * @param {string} horaParametro - Passe uma data no formato Y-m-d.
    */
    alterarConfiNF(horaParametro) {
        console.log("xxxxxxxxxxxxxxxx CONSOLIDAÇÂO DO DIA xxxxxxxxxxxxxxxxxxxxx");

        const diretorioNFe = "src/config/NFeConfig.txt";
        let df = date.create();

        // Se horaParametro não for fornecido, use a hora atual
        let hora = horaParametro ? horaParametro : df.format('Y-m-d');
        let dataHoraMinuto = hora.split(' ')[0] + ' 00:00:00';

        fs.writeFile(diretorioNFe, `${dataHoraMinuto}`, function (errorNaEscrita) {
            if (errorNaEscrita) {
                console.log(errorNaEscrita);
            } else {
                console.log(`Arquivo ${diretorioNFe} atualizado para ${dataHoraMinuto}!`);
                console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
            }
        });
    },
    /**
    * Retorna um objeto `node-datetime` representando o primeiro dia do mês.
    * @returns {Object} Um objeto `node-datetime` representando o último dia do mês.
    *
    */
    primeiroDiaDoMesAtual() {
        let today = new Date();
        let firstDayOfMonth = new Date(today.getFullYear(), today.getMonth() ,1);
        // Formatar a data antes de retornar
        let formattedDate = date.create(firstDayOfMonth).format('Y-m-d H:M:S');
        return formattedDate;
    },
    /**
    * Retorna um objeto `node-datetime` representando o primeiro dia do mês.
    * @returns {Object} Um objeto `node-datetime` representando o último dia do mês.
    *
    */
    ultimoDiaDoMesAtual() {
        let today = new Date();
        let lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1 ,0);
        // Formatar a data antes de retornar
        let formattedDate = date.create(lastDayOfMonth).format('Y-m-d H:M:S');
        return formattedDate;
    }

}