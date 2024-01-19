const fs = require("fs");
const date = require("node-datetime");

const df = date.create();
const formatDate = df.format("Y-m-d") + " 00:00:00";
const diretorioNFe = "src/config/NFeConfig.txt";


module.exports = {
    conexaoSQL() {
        const conexão = 'mssql://sa:PoliSystemsapwd@localhost/PoliSystemServerSQLDB';

        return conexão;
    },

    systemConfig() {
        try {
            let NfeConfig = fs.readFileSync(diretorioNFe, 'utf-8', (errorAoLerArquivo, conteudoDoArquivo) => {
                if (errorAoLerArquivo) {
                    console.log(`Arquivo ${diretorioNFe} NÃO configurado!`);
                } else {
                    return conteudoDoArquivo;
                }
            });

            return NfeConfig;


        } catch (arquivoNaoEmcontrado) {
            console.log("Arquivo não configurado!");
            criarConfig(diretorioNFe, formatDate)
        }
    }
}

function criarConfig(diretorio, conteudoDoArquivo) {
    fs.writeFile(`${diretorio}`, `${conteudoDoArquivo}`, (errorNaEscrita) => {
        if (errorNaEscrita) {
            console.log("Não foi possivel criar o : " + diretorio);
            return false;
        } else {
            console.log(`Por default o sistema criou o arquivo ${diretorio}!`);
            return true;
        }
    });
}