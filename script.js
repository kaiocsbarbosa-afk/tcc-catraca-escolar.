/* Configurações Globais e Variáveis */
:root {
    --primaria: #2563eb;    /* Azul Moderno */
    --sucesso: #16a34a;     /* Verde Aprovado */
    --perigo: #dc2626;      /* Vermelho Bloqueado */
    --alerta: #ca8a04;      /* Amarelo Atenção */
    --fundo: #0f172a;       /* Dark Mode para destacar a câmera */
    --card: #ffffff;
    --texto: #1e293b;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background-color: var(--fundo);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: var(--texto);
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 10px;
}

/* Painel Principal (O Totem) */
.painel-principal {
    background: var(--card);
    width: 100%;
    max-width: 900px;
    border-radius: 24px;
    padding: 25px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 20px;
}

header {
    text-align: center;
}

header h1 {
    font-size: 1.8rem;
    color: var(--primaria);
    text-transform: uppercase;
    letter-spacing: 1px;
}

header p {
    color: #64748b;
    font-size: 1rem;
}

/* Dashboard de Contagem (Topo) */
.dashboard-contadores {
    display: flex;
    gap: 15px;
    justify-content: center;
}

.card-contador {
    background: #f1f5f9;
    padding: 10px 20px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.9rem;
    color: #475569;
    border: 1px solid #e2e8f0;
}

.card-contador span {
    color: var(--primaria);
    font-size: 1.1rem;
    margin-left: 5px;
}

/* Status da Catraca/Sistema */
.status {
    width: 100%;
    padding: 20px;
    border-radius: 16px;
    text-align: center;
    font-size: 1.3rem;
    font-weight: 800;
    text-transform: uppercase;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
}

.bloqueado { background: #fee2e2; color: var(--perigo); border: 2px solid var(--perigo); }
.liberado { background: #dcfce7; color: var(--sucesso); border: 2px solid var(--sucesso); }
.alerta { background: #fef9c3; color: var(--alerta); border: 2px solid var(--alerta); }

/* Painel de Escolha (Botões Grandes) */
.painel-escolha {
    text-align: center;
}

.painel-escolha h2 {
    margin-bottom: 15px;
    font-size: 1.1rem;
    color: #475569;
}

.botoes-refeicao {
    display: flex;
    gap: 15px;
}

.btn-opcao {
    flex: 1;
    height: 110px; /* Altura ideal para toque */
    border: 3px solid #e2e8f0;
    border-radius: 16px;
    background: white;
    font-size: 1.2rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
}

.btn-opcao:active {
    transform: scale(0.95);
}

.btn-opcao.ativo {
    background: var(--primaria);
    color: white;
    border-color: #1d4ed8;
    box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4);
}

/* Container do Vídeo (Câmera) */
#containerVideo {
    position: relative;
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
    border-radius: 20px;
    overflow: hidden;
    background: #000;
    aspect-ratio: 4/3;
    border: 5px solid #f1f5f9;
}

video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1); /* Espelha a câmera para ficar natural para o aluno */
}

canvas {
    position: absolute;
    top: 0;
    left: 0;
    transform: scaleX(-1); /* Espelha o desenho da caixa também */
}

/* Tabela de Histórico (Rodapé) */
.historico-container {
    max-height: 150px;
    overflow-y: auto;
    margin-top: 10px;
    border-top: 1px solid #eee;
}

#tabelaHistorico {
    width: 100%;
    border-collapse: collapse;
}

#tabelaHistorico tr {
    border-bottom: 1px solid #f1f5f9;
}

#tabelaHistorico td {
    padding: 10px;
    font-size: 0.9rem;
    color: #64748b;
}

.foto-miniatura {
    width: 45px;
    height: 45px;
    border-radius: 12px;
    object-fit: cover;
    border: 2px solid var(--primaria);
}

/* Controles ADM (Escondidos/Discretos) */
.controles-adm {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 10px;
    padding-top: 10px;
}

.btn-mini {
    background: none;
    border: 1px solid #cbd5e1;
    color: #94a3b8;
    padding: 5px 15px;
    border-radius: 8px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: 0.3s;
}

.btn-mini:hover {
    background: #f1f5f9;
    color: var(--texto);
    border-color: #94a3b8;
}

/* Responsividade para Telas Pequenas */
@media (max-width: 600px) {
    .botoes-refeicao {
        flex-direction: column;
    }
    .btn-opcao {
        height: 80px;
    }
}
