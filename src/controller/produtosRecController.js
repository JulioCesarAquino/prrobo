const api = require('../function/apiConnection');
const sql = require('mssql');
const config = require('../function/config');

module.exports = {
    async buscarProdutosApi() {

        const CNPJ = await config.consultaLoja();

        try {

            let produto = await api.get(`/sync/produtos/${CNPJ}`);

            const QtdDeProduto = Object.entries(produto.data.dados).length;
            console.log("Qtd de Produtos: ", QtdDeProduto);


            return produto.data.dados;

        } catch (errorAoConsultarProdutoApi) {

            console.log("Erro ao consultar produto na API!");

            config.registrarLogs("src/config/Logs/Produto_logs", `Erro ao consultar produto na API;\n`);

            config.gerarLog('src/log/ConsultarApiProduto', errorAoConsultarProdutoApi);

        }
    },


    async validarProdutosLocal(produto) {

        const CNPJ = await config.consultaLoja();

        if (produto != undefined) {

            let tributo = async () => {

                let consulta = await sql.query`
                    SELECT        IdProdutoTributos AS CdProdutoTributos
                    FROM            PRODUTO_TRIBUTOS
                    WHERE        (DescricaoPerfilTributario = '5115 - VENDA DE PRODUTO (DENTRO DO ESTADO)')
                `;

                let [{ CdProdutoTributos: IdProdutoTributos }] = consulta.recordset;

                return IdProdutoTributos;

            }



            produto.forEach(element => {

                let codRetorno = element.CdProduto;

                let validar = async () => {

                    if (element.CdProduto_legado == 0) {

                        let consultaSemLegado = await sql.query`
                            SELECT CdProduto FROM PRODUTO WHERE CdProduto = ${element.CdProduto}
                        `;

                        return consultaSemLegado.recordset;

                    } else {

                        let consultaComLegado = await sql.query`
                            SELECT CdProduto FROM PRODUTO WHERE CdProduto = ${element.CdProduto_legado};
                        `;

                        if (Object.entries(consultaComLegado.recordset).length == 0 || Object.entries(consultaComLegado.recordset).length == '' || Object.entries(consultaComLegado.recordset).length == undefined) {

                            let consultaSemLegado = await sql.query`
                            SELECT CdProduto FROM PRODUTO WHERE CdProduto = ${element.CdProduto}
                            `;

                            return consultaSemLegado.recordset;
                        }

                        element.CdProduto = element.CdProduto_legado;

                        return consultaComLegado.recordset;

                    }


                }

                validar().then(resul => {

                    tributo().then(ProdutoTributos => {

                        element.CdProdutoTributos = ProdutoTributos;

                        if (element.UltPrecoCpaProdutoNF == "0.0") {

                            element.UltPrecoCpaProdutoNF = element.UltPrecoCpaProdutoForn;
                        }


                        if (Object.entries(resul).length == '' || Object.entries(resul).length == 0) {

                            console.log("Porduto não encontrado no PR TEC!");

                            cadastrarProdutosLocal(element, CNPJ, codRetorno);

                        } else {

                            console.log("Produto encontrado no PR TEC!");

                            atualizarProdutosLocal(element, CNPJ, codRetorno);
                        }

                    }).catch(erroAoGerarTributo => {

                        console.log("Erro ao gerar o tribustos!");

                        config.gerarLog('src/log/GerarTributo', erroAoGerarTributo);

                    });

                });

            });
        }

    }

}

async function cadastrarProdutosLocal(produto, loja, codRetorno) {

    try {

        console.log("Cadastrar Produto!");

        const conexao = await config.conexaoSQL();

        await sql.connect(conexao);

        try {

            let cadastrarProduto = async () => {

                await sql.query`
                    INSERT INTO PRODUTO
                        (CdProduto,DescricaoProduto,DataCadastroProduto,DataUltAltCadProduto,UltPrecoCpaProdutoForn,
                            ValorPercOutrasDespCpaProdFrn,UltPrecoCpaProdutoNF,ValorPercLucroLiquidoProduto,PrecoFinalVdaProduto,
                            CdProdutoTributos,QtdeEstAtualProdutoLoja1,ValorPercTributosFed,ValorPercTributosEst,ValorPercTributosMun,
                            ValorPercTotalTributos,CodigoNCMProduto,CodigoInternoProduto)
                    VALUES(
                        ${produto.CdProduto},
                        ${produto.DescricaoProduto},
                        ${produto.DataCadastroProduto.substring(0, 19)},
                        ${produto.DataUltAltCadProduto.substring(0, 19)},
                        ${produto.UltPrecoCpaProdutoForn},
                        ${produto.ValorPercOutrasDespCpaProdFrn},
                        ${produto.UltPrecoCpaProdutoNF},
                        ${produto.ValorPercLucroLiquidoProduto},
                        ${produto.PrecoFinalVdaProduto},
                        ${produto.CdProdutoTributos},
                        ${produto.QtdeEstAtualProdutoLoja1},
                        ${produto.ValorPercTributosFed},
                        ${produto.ValorPercTributosEst},
                        ${produto.ValorPercTributosMun},
                        ${produto.ValorPercTotalTributos},
                        ${produto.CodigoNCMProduto},
                        ${produto.CodigoInternoProduto}
                    )`;

                return produto.CdProduto;
            }

            let cadastrarProdutoFornecedor = async () => {

                await sql.query`
                    INSERT INTO PRODUTO_FORNECEDOR
                        (CdProduto, CdFornecedor)
                    VALUES(
                        ${produto.CdProduto},
                        ${produto.CdFornecedor}
                    )`;

                return produto.CdProduto;
            }

            cadastrarProduto().then(retorno => {

                console.log("Produto " + retorno + " Cadastrado com sucesso!");

                config.registrarLogs("src/config/Logs/Produto_logs", `Produto ${retorno} cadastrado com Sucesso;\n`);


                let retornoApi = [{ CdProduto: retorno }];


                cadastrarProdutoFornecedor().then(() => {

                    api.patch(`/sync/produtos/${loja}`, retornoApi).then(response => {

                        console.log("Responsta da API: " + response.status);

                        config.registrarLogs("src/config/Logs/Produto_logs", `Produto: ${retorno} - Retornorno API: ${response.status};\n`);


                    }).catch(erroAoRetornarAPI => {

                        console.log("Erro ao retornar resposta a API!");

                        config.registrarLogs("src/config/Logs/Produto_logs", `Erro ao retornar resposta a API;\n`);

                        config.gerarLog('src/log/ProdutoRetornoAPI', erroAoRetornarAPI);

                    });

                }).catch(erroNoInsert => {

                    console.log("Erro ao inserir Produto_Fornecedor!");

                    config.gerarLog("src/log/ProdutoFornecedor-Inserir", erroNoInsert);
                });

                return produto;

            });

        } catch (erroAoInserNovoProduto) {

            console.log("Erro ao cadastrar produto!");

            config.registrarLogs("src/config/Logs/Produto_logs", `Erro ao efetuar o cadastro do produto;\n`);

            config.gerarLog('src/log/CadastrarProduto', erroAoInserNovoProduto);

        }
    } catch (erroAoConectarNoSQL) {

        console.log("Falha ao acessa o Banco SQL!");

        config.registrarLogs("src/config/Logs/Produto_logs", `Falha ao acessar o Banco SQL;\n`);

        config.gerarLog('src/log/ProdutoAcessarSQL', erroAoConectarNoSQL);

    }
}

async function atualizarProdutosLocal(produto, loja, codRetorno) {

    try {

        const conexao = await config.conexaoSQL();

        await sql.connect(conexao);

        try {

            let atualizarProduto = async () => {

                await sql.query`
                    UPDATE PRODUTO
                    SET
                        DescricaoProduto = ${produto.DescricaoProduto},
                        DataCadastroProduto = ${produto.DataCadastroProduto.substring(0, 19)},
                        DataUltAltCadProduto = ${produto.DataUltAltCadProduto.substring(0, 19)},
                        UltPrecoCpaProdutoForn = ${produto.UltPrecoCpaProdutoForn},
                        ValorPercOutrasDespCpaProdFrn = ${produto.ValorPercOutrasDespCpaProdFrn},
                        UltPrecoCpaProdutoNF = ${produto.UltPrecoCpaProdutoNF},
                        ValorPercLucroLiquidoProduto = ${produto.ValorPercLucroLiquidoProduto},
                        PrecoFinalVdaProduto = ${produto.PrecoFinalVdaProduto},
                        QtdeEstAtualProdutoLoja1 = ${produto.QtdeEstAtualProdutoLoja1},
                        CdProdutoTributos = ${produto.CdProdutoTributos},
                        ValorPercTributosFed = ${produto.ValorPercTributosFed},
                        ValorPercTributosEst = ${produto.ValorPercTributosEst},
                        ValorPercTributosMun = ${produto.ValorPercTributosMun},
                        ValorPercTotalTributos = ${produto.ValorPercTotalTributos},
                        CodigoNCMProduto = ${produto.CodigoNCMProduto},
                        CodigoInternoProduto = ${produto.CodigoInternoProduto}
                    WHERE 
                            CdProduto = ${produto.CdProduto}
                    `;

                return produto.CdProduto;
            }

            let exluirProdutoFornecedor = async () => {

                await sql.query`
                    DELETE FROM 
                        PRODUTO_FORNECEDOR 
                    WHERE 
                        CdProduto = ${produto.CdProduto}
                `;

                console.log(produto.CdProduto + " excluido da tabela produto_fornecedor.\n");

            }

            let cadastrarProdutoFornecedor = async () => {

                await sql.query`
                    INSERT INTO PRODUTO_FORNECEDOR
                        (CdProduto, CdFornecedor)
                    VALUES(
                        ${produto.CdProduto},
                        ${produto.CdFornecedor}
                    )`;

                    console.log(produto.CdProduto + " incluido da tabela produto_fornecedor.\n");

                return produto.CdProduto;
            }

            atualizarProduto().then(retorno => {

                console.log("Produto " + codRetorno + " atualizado com sucesso!");

                config.registrarLogs("src/config/Logs/Produto_logs", `Produto: ${retorno} - Atualizado;\n`);

                let retornoApi = [{ CdProduto: codRetorno }];

                exluirProdutoFornecedor().then(() => {

                    cadastrarProdutoFornecedor().then(() => {

                        api.patch(`/sync/produtos/${loja}`, retornoApi).then(response => {

                            console.log("Responsta da API: " + response.status);

                            config.registrarLogs("src/config/Logs/Produto_logs", `Produto: ${retorno} - Retornorno API: ${response.status};\n`);

                        }).catch(erroAoRetornarAPI => {

                            console.log("Erro ao retornar resposta a API!");

                            config.registrarLogs("src/config/Logs/Produto_logs", `Erro ao retornar resposta a API;\n`);

                            config.gerarLog('src/log/ProdutoRetornoAPI', erroAoRetornarAPI);
                        });

                    });



                }).catch(erroAoAtualizarProdutoFornecedor => {

                    console.log("Erro ao retornar resposta a API!");

                    config.gerarLog('src/log/ProdutoFornecedor-Atualizar', erroAoAtualizarProdutoFornecedor);

                })



            });

        } catch (erroAoAtualizarProduto) {

            console.log("Erro ao atualizar produto!");

            config.registrarLogs("src/config/Logs/Produto_logs", `Erro ao atualizar produto;\n`);

            config.gerarLog('src/log/ProdutoAtualizar', erroAoAtualizarProduto);

        }
    } catch (erroAoConectarNoSQL) {

        console.log("Falha ao acessa o Banco SQL!");

        config.registrarLogs("src/config/Logs/Produto_logs", `Falha ao acessa o Banco SQL;\n`);

        config.gerarLog('src/log/ProdutoAcessarSQL', erroAoConectarNoSQL);

    }
}