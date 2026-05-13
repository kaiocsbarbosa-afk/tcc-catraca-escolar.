const video = document.getElementById("videoEscola");
const container = document.getElementById("containerVideo");
const painelStatus = document.getElementById("statusCatraca");
const corpoTabela = document.getElementById("corpoTabela");

const spanCafe = document.getElementById("contCafe");
const spanAlmoco = document.getElementById("contAlmoco");
const spanTotal = document.getElementById("contTotal");

const btnLigar = document.getElementById("btnLigar");
const btnReset = document.getElementById("btnReset");
const btnExportar = document.getElementById("btnExportar");

let comparadorDeRostos; 
let catracaLiberada = true; 
const alunosQueJaComeram = new Set(); 
const LISTA_ALUNOS = ["Kaio"]; // Adicione mais nomes aqui conforme cadastrar fotos
let refeicaoSelecionada = "";

let totalCafe = 0;
let totalAlmoco = 0;

// --- FUNÇÃO DE VOZ ---
function falar(texto) {
    window.speechSynthesis.cancel();
    const mensagem = new SpeechSynthesisUtterance(texto);
    mensagem.lang = 'pt-BR';
    mensagem.rate = 1.2;
    window.speechSynthesis.speak(mensagem);
}

function atualizarContadores(tipo) {
    if (tipo === "Café") totalCafe++;
    if (tipo === "Almoço") totalAlmoco++;
    if (tipo === "Café e Almo
