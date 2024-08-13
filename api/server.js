const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve arquivos estáticos da pasta `public`
app.use(express.static(path.join(__dirname, 'public')));

let processos = [];

app.get('/scrape', async (req, res) => {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'https://selecao-login.app.ufgd.edu.br/';
    
    await page.goto(url, { waitUntil: 'networkidle2' });

    processos = await page.evaluate(() => {
      const processos = [];
      const rows = document.querySelectorAll('tr[ng-repeat="processo in ctrl.inscricoesAbertas track by $index"]');
      
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        const titulo = cells[0].innerText.trim();
        const descricao = cells[1].innerText.trim().replace('Mostrar mais', '').trim();
        const periodo = cells[2].innerText.trim();
        const editalUrl = cells[3].querySelector('a').href;
        const paginaUrl = cells[4].querySelector('a').href;

        if (!titulo.startsWith('PSIE')) {
          processos.push({
            titulo: titulo,
            descricao: descricao,
            periodo: periodo,
            url: paginaUrl,
            edital: editalUrl
          });
        }
      });

      return processos;
    });

    await browser.close();
    res.json({ processos });
  } catch (error) {
    console.error('Erro ao acessar a página de scraping:', error.message);
    res.status(500).send('Erro ao acessar a página de scraping');
  }
});

app.post('/atualizar', async (req, res) => {
  try {
    const { processosAtualizados } = req.body;
    await axios.put(process.env.API_URL, { processos: processosAtualizados });
    res.send('Dados atualizados com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar os dados na API:', error.response ? error.response.data : error.message);
    res.status(500).send('Erro ao atualizar os dados na API');
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
