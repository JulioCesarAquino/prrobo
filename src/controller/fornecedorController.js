const sql = require('mssql');
const fs = require('fs');
const api = require('../function/apiConnection');
const date = require('node-datetime');
const config = require('../function/config');


module.exports = {
    async consultarFornecedorApi() {

        try {

            const loja = await config.consultaLoja();

            console.log("Loja: ", loja);

            try {

                let fornecedor = await api.get(`/sync/fornecedores/${loja}`);

                const QtdDeFornecedor = Object.entries(fornecedor.data.dados).length;
                console.log("Qtd de Fornecedores: ", QtdDeFornecedor);

                if (QtdDeFornecedor != '') {
                    console.log(" ---------------- Sincronização de fornecedores  ---------------- ");

                    registrarLogs("src/config/Logs/Fornecedor_logs", `---- Sincronização de Fornecedores ----;\n`);

                    console.log("");

                    validarFornecedor(fornecedor.data.dados, loja);
                } else {
                    console.log("Não existe novos Fornecedores!");

                    console.log("--------------------------------");
                }


            } catch (erroAoConecatarNaAPI) {
                console.log("Não foi possivel consultar Fornecedor na API!");

                registrarLogs("src/config/Logs/Fornecedor_logs", `Não foi possivel consultar Fornecedor na API!;\n`);

                const df = date.create();
                const formatDate = df.format('Y-m-d-HMS');

                gerarLog(`src/log/ConsultarApiFornecedor-${formatDate}.txt`, erroAoConecatarNaAPI);

            }

        } catch (erroAoConectarNoSQL) {
            console.log("Não foi possivel consultar Fornecedor na API!");

            registrarLogs("src/config/Logs/Fornecedor_logs", `Não foi possivel consultar Fornecedor na API!;\n`);

            const df = date.create();
            const formatDate = df.format('Y-m-d H:M:S');

            console.log(erroAoConectarNoSQL);

            gerarLog(`src/log/ConectarSQL-${formatDate}.txt`, JSON.stringify(erroAoConectarNoSQL));
        }
    }
}

function validarFornecedor(fornecedores, loja) {

    try {

        fornecedores.forEach(element => {

            let valor = async () => {
                let consulta = await sql.query`
                SELECT CPF_CNPJFornecedor, CdFornecedor FROM FORNECEDOR WHERE CPF_CNPJFornecedor = ${element.doc_formatado}
                `;

                return consulta.recordset;
            }



            valor().then(resul => {

                if (element.end_complemento == null) {
                    element.end_complemento = "";
                }
                if (element.end_bairro == null) {
                    element.end_bairro = "";
                }
                if (element.razao_social == null) {
                    element.razao_social = "";
                }
                element.end_bairro = element.end_bairro.substring(0, 50);
                element.end_complemento = element.end_complemento.substring(0, 20);
                element.razao_social = element.razao_social.substring(0, 70);

                

                if (Object.entries(resul).length != '' || Object.entries(resul).length != 0) {

                    atualizarFornecedorNoPRTEC(element, loja);

                } else {

                    cadastrarFornecedorNoPRTEC(element, loja);

                }

            });
        });

    } catch (erroAoValidarFornecedores) {
        console.log("Erro ao validar dados de fornecedores!");

        registrarLogs("src/config/Logs/Fornecedor_logs", `Erro ao validar dados de fornecedores!;\n`);

        const df = date.create();
        const formatDate = df.format('Y-m-d-HMS');
        console.log(erroAoValidarFornecedores);
        gerarLog(`src/log/ValidarDados-${formatDate}.txt`, erroAoValidarFornecedores);

    }
}

function cadastrarFornecedorNoPRTEC(fornecedores, loja) {
    try {

        let retornoSQL = async () => {
            await sql.query`
                INSERT INTO FORNECEDOR
                            (SiglaTipoFornecedor, CPF_CNPJFornecedor, InscEst_CartIdFornecedor, NomeFornecedor, RazaoSocialFornecedor, LogradouroFornecedor, 
                            NrEnderecoFornecedor, CompLogrFornecedor, BairroFornecedor,CidadeFornecedor, IDMunicipioFornecedor,
                            CEPFornecedor, FoneComercial1Fornecedor, FoneCelularFornecedor, 
                            EmailFornecedor)
                VALUES(
                    ${fornecedores.tipo_doc_maqplan},
                ${fornecedores.doc_formatado},
                ${fornecedores.insc_estadual},
                ${fornecedores.razao_social},
                ${fornecedores.razao_social},
                ${fornecedores.end_logradouro},
                ${fornecedores.end_nr_maqplan},
                ${fornecedores.end_complemento},
                ${fornecedores.end_bairro},
                ${fornecedores.end_cidade},
                ${fornecedores.end_uf_cidade_ibge},
                ${fornecedores.end_cep},
                ${fornecedores.telefone},
                ${fornecedores.celular},
                ${fornecedores.email}

            )`;
            return fornecedores.razao_social;
        }

        retornoSQL().then(result => {

            console.log(`Fornecedor ${result} cadastrado!`);

            retornoAPI(loja, fornecedores);

            registrarLogs("src/config/Logs/Fornecedor_logs", `Fornecedor ${result} cadastrado!;\n`);

        });



    } catch (erroAoInserirNovoFornecedor) {
        console.log("Erro ao cadastrar Fornecedor no PR TEC!");

        registrarLogs("src/config/Logs/Fornecedor_logs", `Erro ao cadastrar Fornecedor no PR TEC!;\n`);

        const df = date.create();
        const formatDate = df.format('Y-m-d-HMS');
        gerarLog(`src/log/ErroAoInserirFornecedor-${formatDate}.txt`, erroAoInserirNovoFornecedor);
    }
}

function atualizarFornecedorNoPRTEC(fornecedores, loja) {
    try {

        let retornoSQL = async () => {
            await sql.query`
                UPDATE FORNECEDOR SET

                            InscEst_CartIdFornecedor = ${fornecedores.insc_estadual},
                            RazaoSocialFornecedor = ${fornecedores.razao_social},
                            LogradouroFornecedor = ${fornecedores.end_logradouro},
                            NrEnderecoFornecedor = ${fornecedores.end_nr_maqplan},
                            CompLogrFornecedor = ${fornecedores.end_complemento},
                            BairroFornecedor = ${fornecedores.end_bairro},
                            CidadeFornecedor = MUNICIPIO.NomeMunicipio,
                            IDMunicipioFornecedor = ${fornecedores.end_uf_cidade_ibge},
                            CEPFornecedor = ${fornecedores.end_cep},
                            FoneComercial1Fornecedor = ${fornecedores.telefone},
                            FoneCelularFornecedor = ${fornecedores.celular},
                            EmailFornecedor = ${fornecedores.email},
                            SiglaUFFornecedor = UF.SiglaUF
                            
                FROM        FORNECEDOR LEFT OUTER JOIN
                            MUNICIPIO ON FORNECEDOR.IDMunicipioFornecedor = MUNICIPIO.CdMunicipio 
                            INNER JOIN
                            UF ON UF.CdUF = MUNICIPIO.NrUF
                WHERE 
                            CPF_CNPJFornecedor = ${fornecedores.doc_formatado}`;

            return fornecedores.razao_social;
        }

        retornoSQL().then(result => {
            console.log(`Fornecedor ${result} atualização!`);

            retornoAPI(loja, fornecedores);

            registrarLogs("src/config/Logs/Fornecedor_logs", `Fornecedor ${result} Atualizado!;\n`);

        });




    } catch (erroAoAtualizarFornecedor) {
        console.log("Erro ao atualizar Fornecedor no PR TEC!");

        registrarLogs("src/config/Logs/Fornecedor_logs", `Erro ao atualizar Fornecedor no PR TEC!;\n`);

        const df = date.create();
        const formatDate = df.format('Y-m-d-HMS');
        gerarLog(`src/log/ErroAoAtualizarFornecedor-${formatDate}.txt`, erroAoAtualizarFornecedor);
    }
}

function retornoAPI(loja, fornecedores) {

    let concaternarNomeFornecedor = async () => {
        await sql.query`
        UPDATE FORNECEDOR SET 
            NomeFornecedor = CONVERT(varchar, CdFornecedor) + ' - ' + RazaoSocialFornecedor 
        WHERE 
            CPF_CNPJFornecedor = ${fornecedores.doc_formatado}
        `;
    }

    let retornoAPI = async () => {
        let consulta = await sql.query`
        SELECT CPF_CNPJFornecedor, CdFornecedor FROM FORNECEDOR WHERE CPF_CNPJFornecedor = ${fornecedores.doc_formatado}
        `;

        return consulta.recordset;
    }

    concaternarNomeFornecedor().then(() => {

        retornoAPI().then(retorno => {

            api.patch(`/sync/fornecedores/${loja}`, retorno).then(response => {

                console.log("Responsta da API: " + response.status);

                registrarLogs("src/config/Logs/Fornecedor_logs", `Responsta da API: " + ${response.status};\n`);

                console.log("--------------------------------");
            });

        });

    }).catch(erro => {
        console.log("Erro ao enviar o retorno para a API!");
    });
}

function gerarLog(diretorio, conteudoDoArquivo) {

    fs.writeFile(`${diretorio}`, `${conteudoDoArquivo}`, (errorNaEscrita) => {
        if (errorNaEscrita) {
            console.log("Erro ao gerar um log: " + diretorio + errorNaEscrita);
            return false;
        } else {
            console.log(`Log gerado no diretorio:  ${diretorio}!`);
            return true;
        }
    });
}

function registrarLogs(prefixo, menssagem) {

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

}