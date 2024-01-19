const sql = require('mssql');
const fs = require('fs');
const api = require('../function/apiConnection');
const date = require('node-datetime');
const NFeConfig = require('../function/configNFe');
const config = require('../function/config');

const diretorioNFe = "src/config/NFeConfig.txt";

module.exports = {
    
                
    async consultarVendas() {
        let LastDay = config.primeiroDiaDoMesAtual()
                // let frts = LastDay.format("Y-m-d");
                console.log(LastDay)
        try {

            const conexao = NFeConfig.conexaoSQL();

            await sql.connect(conexao);
            const CNPJLoja = await sql.query("SELECT CNPJEmpresa FROM EMPRESA WHERE (CdEmpresa = 1)");

            const [{ CNPJEmpresa: cnpj }] = CNPJLoja.recordset;
            const loja = cnpj.normalize().replace(/([\u0300-\u036f]|[^0-9a-zA-Z])/g, '');

            console.log(" ---------------- Sincronização de Vendas  ---------------- ");
            console.log("CNPJ Loja: ", cnpj);

            try {

                let dataFiltro = NFeConfig.systemConfig();

                console.log("Data ultima sincronização vendas: ", dataFiltro);

                const df = date.create();
                const HorarioAtual = df.format("Y-m-d H:M:S");

                console.log("Data hora atual: ", HorarioAtual);


                let notasFiscais = await sql.query`
                    SELECT      VENDA.CdVenda, VENDA.NrDocFiscalVenda, VENDA.DataHoraVenda, DataHoraUltAlteracaoVenda, VENDA.SiglaTipoDocFiscal, 
                                VENDA.SiglaStatusVenda, VENDA.IdNFe, VENDA.NrProtocoloNFe, FUNCIONARIO.NomeFuncionario, VENDA.CdCliente, CLIENTE.CPF_CNPJCliente, 
                                CLIENTE.NomeCliente, CLIENTE.RazaoSocialCliente, VENDA.FoneClienteVenda, VENDA.EmailClienteVenda, 
                                VENDA.ContatoClienteVenda, VENDA.ValorTotalPlanoPagtoVenda, VENDA.ValorTotalVenda, VENDA.ValorRecebido, VENDA.ValorFrete
                    FROM            VENDA INNER JOIN
                                            FUNCIONARIO ON VENDA.CdFuncionario = FUNCIONARIO.CdFuncionario INNER JOIN
                                            CLIENTE ON VENDA.CdCliente = CLIENTE.CdCliente LEFT OUTER JOIN
                                            NFE ON VENDA.IdNFe COLLATE Latin1_General_CI_AS = NFE.Id
                    WHERE        
                    VENDA.SiglaStatusVenda IN ('RC', 'VF', 'DV', 'CC')
                    AND VENDA.SiglaTipoDocFiscal <> 'ORC'
                    AND (VENDA.DataHoraUltAlteracaoVenda >= CONVERT(DATETIME, ${dataFiltro}, 102))
                    ORDER BY VENDA.CdVenda
                `;

                let itensNotaFiscal = await sql.query`
                    SELECT       VENDA_ITENS.IDKeyItemVenda, VENDA.CdVenda, VENDA_ITENS.CdProduto, VENDA_ITENS.NrItemVenda, 
                                PRODUTO.DescricaoProduto, VENDA_ITENS.QtdeItemVenda, VENDA_ITENS.PrecoItemVenda, 
                                VENDA_ITENS.ValorDescontoItemVenda, VENDA_ITENS.CustoItemVenda, PRODUTO.UltPrecoCpaProdutoForn,
                                (VENDA_ITENS.PrecoItemVenda + VENDA_ITENS.ValorDescontoItemVenda) * VENDA_ITENS.QtdeItemVenda AS valorLiquidoVenda, 
                                PRODUTO_FORNECEDOR.CdFornecedor, FORNECEDOR.CPF_CNPJFornecedor, FORNECEDOR.NomeFornecedor, FORNECEDOR.RazaoSocialFornecedor, 
                                PRODUTO.DataCadastroProduto, FUNCIONARIO.NomeFuncionario AS NomeVendedor, FUNCIONARIO.CPFFuncionario AS CpfVendedor
                    FROM            VENDA_ITENS INNER JOIN
                                            VENDA ON VENDA_ITENS.CdVenda = VENDA.CdVenda INNER JOIN
                                            PRODUTO ON VENDA_ITENS.CdProduto = PRODUTO.CdProduto INNER JOIN
                                            PRODUTO_FORNECEDOR ON PRODUTO.CdProduto = PRODUTO_FORNECEDOR.CdProduto INNER JOIN
                                            FORNECEDOR ON PRODUTO_FORNECEDOR.CdFornecedor = FORNECEDOR.CdFornecedor INNER JOIN
					                        FUNCIONARIO ON VENDA_ITENS.CdFuncionario = FUNCIONARIO.CdFuncionario
                    WHERE        
                    VENDA.SiglaStatusVenda IN ('RC', 'VF', 'DV', 'CC')
                    AND VENDA.SiglaTipoDocFiscal <> 'ORC'
                    AND (VENDA.DataHoraUltAlteracaoVenda >= CONVERT(DATETIME, ${dataFiltro}, 102))
                `;

                let formaPag = await sql.query`
                    SELECT        CONTAS_RECEBER.CdVenda, PLANO_PAGTO.NomePlano, CONTAS_RECEBER.ValorFinalParcela
                                FROM            
                                            CONTAS_RECEBER INNER JOIN
                                            PLANO_PAGTO ON CONTAS_RECEBER.CdPlano = PLANO_PAGTO.CdPlano INNER JOIN
                                            VENDA ON CONTAS_RECEBER.CdVenda = VENDA.CdVenda
                                WHERE        
                                            (VENDA.SiglaStatusVenda IN ('RC', 'VF', 'DV', 'CC')) 
                                            AND (VENDA.SiglaTipoDocFiscal <> 'ORC')
                                            AND (VENDA.DataHoraUltAlteracaoVenda >= CONVERT(DATETIME, ${dataFiltro}, 102))
                `;

                registrarLogs("src/config/Logs/NFe_logs", `Data Ultima sincronização; ${dataFiltro}\n`);

                console.log("Vendas: ", Object.entries(notasFiscais.recordset).length);

                console.log("Itens: ", Object.entries(itensNotaFiscal.recordset).length);

                console.log("FormaPagamento: ", Object.entries(formaPag.recordset).length);


                let vendas = [];

                notasFiscais.recordset.forEach(element => {
                    vendas.push({
                        ...element,
                        itens: itensNotaFiscal.recordset.filter(item => {
                            return item.CdVenda === element.CdVenda
                        }),
                        formaPagamentos: formaPag.recordset.filter(itensPag => {
                            return itensPag.CdVenda === element.CdVenda
                        })
                    })
                });


                return vendas;

            } catch (erroAoSelecionarVendas) {
                console.log("Erro ao consultar vendas!");

                registrarLogs("src/config/Logs/NFe_logs", `Erro ao consultar NFe;\n`);

                const df = date.create();
                const formatDate = df.format('Y-m-d-HMS');

                gerarLog(`src/log/Consultar-NFe-${formatDate}.txt`, JSON.stringify(erroAoConectarNoSQL));
            }

        } catch (erroAoConectarNoSQL) {
            console.log("Erro ao conectar no SQL!");

            registrarLogs("src/config/Logs/NFe_logs", `Erro ao conectar no SQL;\n`);

            const df = date.create();
            const formatDate = df.format('Y-m-d-HMS');

            gerarLog(`src/log/ConectarSQL-${formatDate}.txt`, JSON.stringify(erroAoConectarNoSQL));
        }
    },
    async enviarNFe(vendas) {

        try {
            let QtdDeVendas = Object.entries(vendas).length;

            if (QtdDeVendas === 0 || vendas === undefined) {
                console.log("Não existe novas vendas!");

                console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

            } else {
                const conexao = NFeConfig.conexaoSQL();

                await sql.connect(conexao);
                const CNPJLoja = await sql.query("SELECT CNPJEmpresa FROM EMPRESA WHERE (CdEmpresa = 1)");

                const [{ CNPJEmpresa: cnpj }] = CNPJLoja.recordset;
                const loja = cnpj.normalize().replace(/([\u0300-\u036f]|[^0-9a-zA-Z])/g, '');

                registrarLogs("src/config/Logs/NFe_logs", `----- Sincronização de NFe -----;\n`);

                console.log("Qtd de vendas: ", QtdDeVendas);

                registrarLogs("src/config/Logs/NFe_logs", `Qtd de NFe: ${QtdDeVendas};\n`);

                console.log("CNPJ: ", loja);

                if (QtdDeVendas <= 30) {
                    try {
                        await api.post(`/nfs/${loja}`, vendas).then((response) => {

                            console.log("Resposta da API: ", response.status);

                            registrarLogs("src/config/Logs/NFe_logs", `Resposta da API: ${response.status};\n`);

                            if (response.status >= 200 && response.status <= 299) {

                                const dataSinc = gerarMinutoAnterior();
                                console.log("Data sincronização: ", dataSinc);

                                registrarLogs("src/config/Logs/NFe_logs", `Filtro da sincronização: ${dataSinc};\n`);

                                fs.writeFile(diretorioNFe, `${dataSinc}`, function (errorNaEscrita) {
                                    if (errorNaEscrita) {
                                        console.log(errorNaEscrita);
                                    } else {
                                        console.log(`Arquivo ${diretorioNFe} atualizado para ${dataSinc}!`);
                                        console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
                                    }
                                });
                            }
                        });
                    } catch (erroAoEnviarVendas) {
                        console.log("Erro ao enviar NF-e!");

                        registrarLogs("src/config/Logs/NFe_logs", `Erro ao enviar NF-e;\n`);

                        const df = date.create();
                        const formatDate = df.format('Y-m-d-HMS');

                        gerarLog(`src/log/ErroAoEnviarNFe-${formatDate}.txt`, JSON.stringify(erroAoEnviarVendas));
                    }
                } else {
                    seguimentarVendas(vendas, loja, QtdDeVendas);
                }
            }
        } catch (erroAoReceberVendas) {
            console.log("Erro ao receber NFe!");

            registrarLogs("src/config/Logs/NFe_logs", `Erro ao receber NFe;\n`);
        }
    },
    // Função resposável por enviar os dados de vendas diária para conferência com o prbko
    async contaVendaDia(dataParam) {
        try {
            const conexao = NFeConfig.conexaoSQL();

            await sql.connect(conexao);
            const CNPJLoja = await sql.query("SELECT CNPJEmpresa FROM EMPRESA WHERE (CdEmpresa = 1)");
            const [{ CNPJEmpresa: cnpj }] = CNPJLoja.recordset;
            const loja = cnpj.normalize().replace(/([\u0300-\u036f]|[^0-9a-zA-Z])/g, '');
            console.log(" ---------------- Sincronização para conferência de Vendas  ---------------- ");
            console.log("");
            console.log("CNPJ Loja: ", cnpj);
            let df = date.create();
            let HorarioAtual = df.format("Y-m-d H:M:S");
            let dataFilter = dataParam ? dataParam : NFeConfig.systemConfig();

            console.log("Data hora da consulta: ", HorarioAtual);
            let sales = await sql.query`SELECT
            CONVERT(date, VENDA.DataHoraVenda) AS DataVenda,
            COUNT(*) AS QuantidadeVendas,
            SUM(VENDA.ValorTotalPlanoPagtoVenda) AS ValorTotalPlanoPagto,
            SUM(VENDA.ValorTotalVenda) AS ValorTotalVenda
        FROM
            VENDA
        WHERE
            (VENDA.SiglaStatusVenda = 'VF')
            AND (VENDA.SiglaTipoDocFiscal <> 'ORC')
            AND (VENDA.DataHoraUltAlteracaoVenda >= CONVERT(DATETIME, ${dataFilter}, 102))
        GROUP BY
            CONVERT(date, VENDA.DataHoraVenda);`;
            // await api.post(`/sync-sale/${cnpj}`, sales).then((response) => {
            //     console.log("Resposta da API: ", response.status);
            //     registrarLogs("src/config/Logs/sync_venda_logs", `Resposta da API: ${response.status};\n`);
            // });
            console.log('*************************************');
            console.log(sales);
            console.log('*************************************');

        } catch (error) {
            console.error('Erro ao sincronizar vendas:', error);
            registrarLogs("src/config/Logs/sync-vendas", `Resposta da API: ${error};\n`);
        }
    }
}

function seguimentarVendas(vendas, loja, QtdDeVendas) {
    let separadorDeLote = 0,
        vendasSeguimentado = [],
        numeroLote = 0,
        contador = 0;

    vendas.forEach(element => {
        contador++;
        vendasSeguimentado.push(element);

        if (separadorDeLote === 500 || contador === QtdDeVendas) {

            console.log("Lote de vendas: ", numeroLote);

            registrarLogs("src/config/Logs/NFe_logs", `Lote de NFe: ${numeroLote};\n`);

            console.log("Qtd de Object na vendas: ", Object.entries(vendasSeguimentado).length);

            registrarLogs("src/config/Logs/NFe_logs", `Qtd de object no lote: ${Object.entries(vendasSeguimentado).length};\n`);

            envioSegmentando(loja, vendasSeguimentado, numeroLote).then(resposta => { });

            numeroLote++;
            separadorDeLote = 0;
            vendasSeguimentado = [];

        }
        separadorDeLote++;
    });

    // REGISTRA A DATA A ATUALIZAÇÃO
    console.log("Total de vendas enviadas: ", contador);

    registrarLogs("src/config/Logs/NFe_logs", `Total de NFe enviadas: ${contador};\n`);

    const dataSinc = gerarMinutoAnterior();
    console.log("Data sincronização: ", dataSinc);

    fs.writeFile(diretorioNFe, `${dataSinc}`, (erroAoAlterarConfig) => {
        if (erroAoAlterarConfig) {
            console.log(erroAoAlterarConfig);
        }
        console.log(`Arquivo ${diretorioNFe} atualizado para ${dataSinc}!`);
        console.log("-------------------------------------");
    });
}

async function envioSegmentando(cnpj, lote, numeroLotes) {
    try {

        api.post(`/nfs/${cnpj}/1`, lote).then((response) => {

            if (response.status >= 200 && response.status <= 299) {

                console.log("1º Tentativa Notas - Lote: " + numeroLotes + " enviado");

                registrarLogs("src/config/Logs/NFe_logs", `1º Tentativa lote: ${numeroLotes} enviado;\n`);

            } if (response.status == 429) {

                console.log("Erro de requisição!");
                console.log(`Lote de vendas ${numeroLotes} não enviado!`);
            }
        }).catch((ErroNoEnvio) => {

            console.log("1º Tentativa Notas - Erro ao enviarlote: ", numeroLotes);

            registrarLogs("src/config/Logs/NFe_logs", `1º Tentativa lote: ${numeroLotes} NÃO ENVIADO;\n`);


            api.post(`/nfs/${cnpj}/1`, lote).then((response) => {
                if (response.status >= 200 && response.status <= 299) {

                    console.log("2º Tentativa Notas - Lote: " + numeroLotes + " reenviado!");

                    registrarLogs("src/config/Logs/NFe_logs", `2º Tentativa lote: ${numeroLotes} enviado;\n`);

                } if (response.status == 429) {
                    console.log("Erro de requisição!");
                    console.log(`Lote de vendas${numeroLotes} não reenviado!`);
                }
            }).catch(erroNoReenvio => {

                console.log("2º Tentativa Notas - Erro ao enviarlote: ", numeroLotes);

                registrarLogs("src/config/Logs/NFe_logs", `2° Tentativa lote: ${numeroLotes} NÃO ENVIADO;\n`);

                api.post(`/nfs/${cnpj}/1`, lote).then((response) => {
                    if (response.status >= 200 && response.status <= 299) {

                        console.log("3º Tentativa Notas - Lote: " + numeroLotes + " reenviado!");

                        registrarLogs("src/config/Logs/NFe_logs", `3º Tentativa lote: ${numeroLotes} enviado;\n`);

                    } if (response.status == 429) {

                        console.log("Erro de requisição!");

                        console.log(`Lote de vendas${numeroLotes} não reenviado!`);
                    }
                }).catch((erroAoEnviarSegundaTentativa) => {

                    console.log("3º Tentativa Notas - Erro ao enviarlote: ", numeroLotes);

                    registrarLogs("src/config/Logs/NFe_logs", `3º Tentativa lote: ${numeroLotes} NÃO ENVIADO;\n`);

                    fs.writeFile(`src/log/${numeroLotes}-Nota-LoteComProblema.txt`, `${JSON.stringify(lote)}`, (errorNaEscrita) => {
                        if (errorNaEscrita) {
                            console.log("Erro ao registrar o log.", errorNaEscrita);
                        } else {

                        }
                    });

                    fs.writeFile(`src/log/${numeroLotes}-Nota-ErroNoEnvioDoLote.txt`, `${JSON.stringify(erroAoEnviarSegundaTentativa)}`, (errorNaEscrita) => {
                        if (errorNaEscrita) {
                            console.log("Erro ao registrar o log.", errorNaEscrita);
                        } else {

                        }
                    });
                });
            });
        });

    } catch (ErroAoEnviarLote) {
        fs.writeFile(`src/log/EnvioEmLote-NFe${numeroLotes}.txt`, `${ErroAoEnviarLote}`, (errorNaEscrita) => {
            if (errorNaEscrita) {
                console.log("Erro ao registrar o log.", errorNaEscrita);
            } else {

                console.log(`Log gravado em src/log/EnvioEmLote-NFe${numeroLotes}.txt !`);
            }
        });
    }

}

function gerarLog(diretorio, conteudoDoArquivo) {
    fs.writeFile(`${diretorio}`, `${conteudoDoArquivo}`, (errorNaEscrita) => {
        if (errorNaEscrita) {
            console.log("Erro ao gerar um log: " + diretorio);
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

function gerarMinutoAnterior() {

    const df = date.create();

    let dataAtual = df.format('Y-m-d');

    let horas = df.format('H');
    let minutos = df.format('M');
    let segundos = df.format('S');

    let minutoAnterios = minutos - 5;

    if (minutoAnterios < 0) {
        let horaAnterior = horas - 1;
        return dataHora = dataAtual + ' ' + horaAnterior + ':' + minutos + ':' + segundos;
    } else {
        return dataHora = dataAtual + ' ' + horas + ':' + minutoAnterios + ':' + segundos;
    }
}

