
# Robô de Automação - Guia de Instalação e Uso

Este é um guia passo a passo para instalar e usar o robô de automação em Node.js. O robô foi projetado para automatizar tarefas específicas e pode ser facilmente instalado e executado em máquinas Windows.


## Pré Requisitos
Pré-requisitos Antes de começar, verifique se você tem o seguinte instalado em seu sistema:

Node.js Git (opcional, se você optar por clonar o repositório) Instalação Faça o download do projeto ou clone o repositório para o diretório de sua escolha.

Clonando o repositório: 
```bash
git clone https://github.com/JulioCesarAquino/prrobo.git
```
Ou faça o download manualmente e extraia os arquivos para o diretório de sua escolha, por exemplo, C:\Node. Navegue até o diretório onde o projeto foi baixado ou clonado.
## Instalação
Instale as dependências do projeto utilizando o npm:
Configuração Dentro do diretório src/function/, localize o arquivo apiConnection.example

Renomeie o arquivo apiConnection.example para apiConnection.js.

Abra o arquivo apiConnection.js em um editor de texto e insira as configurações necessárias para a conexão com a API.
```bash
cd C:/Node
npm install

```
    
## Configuração
Dentro do diretório src/function/, localize o arquivo apiConnection.example

Renomeie o arquivo apiConnection.example para apiConnection.js.

Abra o arquivo apiConnection.js em um editor de texto e insira as configurações necessárias para a conexão com a API.
## Execução
Após concluir a instalação e configuração, execute o comando abaixo na raiz do projeto:

```bash
cd C:/Node
npm start

```
Aguarde alguns segundos para que o robô seja iniciado.

Feche o terminal após a inicialização do robô.
## Iniciando o Serviço do Robô No Windows
 abra o "Serviços" procurando-o no menu Iniciar ou digitando "services.msc" na barra de pesquisa.

Localize o serviço denominado "prrobo".

Clique com o botão direito do mouse sobre o serviço e selecione "Iniciar".

O robô será executado como um serviço do Windows e estará pronto para automatizar as tarefas definidas.
## Observações
Observações Certifique-se de configurar corretamente as credenciais da API no arquivo apiConnection.js. Você pode personalizar as tarefas e comportamento do robô editando o código-fonte no diretório src/. Sempre verifique os logs e mensagens de erro para solucionar problemas durante a execução do robô. Agora você está pronto para usar o robô de automação em seu ambiente Windows! Se precisar de ajuda adicional ou tiver dúvidas, consulte a documentação ou entre em contato com o suporte técnico.
## Stack utilizada
**Back-end:** Node, Express, node-windows

