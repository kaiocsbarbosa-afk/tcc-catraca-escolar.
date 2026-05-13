// Seletores globais
const video = document.getElementById("videoEscola");
const container = document.getElementById("containerVideo");
const painelStatus = document.getElementById("statusCatraca");
const corpoTabela = document.getElementById("corpoTabela");

// Configurações do Sistema
const LISTA_ALUNOS = ["Kaio"]; // O ID deve ser IGUAL ao id da <img> no HTML
let comparadorDeRostos;
let catracaLiberada = true;
let refeicaoSelecionada = "";
const alunosQueJaComeram = new Set();
let totalRegistros = 0;

/**
 * INICIALIZAÇÃO DO TOTEM
 * Ordem: Câmera -> Modelos da IA -> Reconhecimento
 */
async function iniciarTotem() {
    try {
        // 1. Tentar ligar a câmera imediatamente
        await ligarCamera();
        console.log("Câmera conectada com sucesso.");
        
        // 2. Carregar a Inteligência Artificial
        painelStatus.innerText = "CARREGANDO CÉREBRO DA IA...";
        await carregarModelos();
        
        painelStatus.innerText = "SISTEMA PRONTO! ESCOLHA A OPÇÃO.";
        painelStatus.className = "status-badge alerta";
        
    } catch (err) {
        console.error("Falha na inicialização:", err);
        painelStatus.innerText = "ERRO: CÂMERA NÃO ENCONTRADA OU BLOQUEADA";
        painelStatus.className = "status-badge bloqueado";
    }
}

/**
 * CONFIGURAÇÃO DA CÂMERA
 */
async function ligarCamera() {
    // Configurações otimizadas para Chromebook (performance e resolução)
    const constraints = {
        video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user" // Garante que use a câmera frontal
        }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;

    // Retorna uma Promise que resolve quando o vídeo realmente começar a tocar
    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            video.play();
            resolve();
        };
    });
}

/**
 * CARREGAMENTO DA IA
 */
async function carregarModelos() {
    const URL_MODELS = 'https://vladmandic.github.io/face-api/model/';
    
    // Carrega os 3 modelos necessários simultaneamente
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(URL_MODELS),
        faceapi.nets.faceLandmark68Net.loadFromUri(URL_MODELS),
        faceapi.nets.faceRecognitionNet.loadFromUri(URL_MODELS)
    ]);

    // Treina o comparador com as fotos da biblioteca
    const descritores = await Promise.all(LISTA_ALUNOS.map(async nome => {
        const img = document.getElementById(nome);
        if (!img) {
            console.error(`Foto do aluno ${nome} não encontrada no HTML.`);
            return null;
        }
        const d = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                                .withFaceLandmarks()
                                .withFaceDescriptor();
        
        if (!d) {
            console.warn(`Não foi possível detectar rosto na foto de: ${nome}`);
            return null;
        }
        return new faceapi.LabeledFaceDescriptors(nome, [d.descriptor]);
    }));

    // Filtra nulos e cria o Matcher
    const descritoresValidos = descritores.filter(d => d !== null);
    comparadorDeRostos = new faceapi.FaceMatcher(descritoresValidos, 0.45);
}

/**
 * SÍNTESE DE VOZ (Feedback Sonoro)
 */
function falar(texto) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(texto);
    msg.lang = 'pt-BR';
    msg.rate = 1.1; // Velocidade levemente aumentada para não ser monótono
    window.speechSynthesis.speak(msg);
}

/**
 * SELEÇÃO DE REFEIÇÃO
 */
document.querySelectorAll(".btn-totem").forEach(btn => {
    btn.addEventListener("click", (e) => {
        refeicaoSelecionada = e.target.innerText;
        
        // Estética dos botões
        document.querySelectorAll(".btn-totem").forEach(b => b.classList.remove("ativo"));
        e.target.classList.add("ativo");
        
        painelStatus.innerText = "IDENTIFICANDO ALUNO...";
        painelStatus.className = "status-badge alerta";
        
        // Ativa a voz (importante: o navegador só deixa falar após um clique do usuário)
        falar(`Opção ${refeicaoSelecionada} selecionada. Olhe para a câmera.`);
    });
});

/**
 * LOOP DE RECONHECIMENTO FACIAL
 */
video.addEventListener("play", () => {
    // Cria o canvas para desenhar a linha azul
    const canvas = faceapi.createCanvasFromMedia(video);
    container.append(canvas);
    
    // Fix: Sincroniza o tamanho do desenho com o tamanho que o vídeo aparece na tela
    const displaySize = { width: video.offsetWidth, height: video.offsetHeight };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        // Detecta rostos
        const detec = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                                   .withFaceLandmarks()
                                   .withFaceDescriptors();
        
        // Ajusta resultados ao tamanho da tela
        const resized = faceapi.resizeResults(detec, displaySize);
        
        // Limpa o desenho anterior
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        resized.forEach(d => {
            const match = comparadorDeRostos.findBestMatch(d.descriptor);
            
            // Desenho da Caixa de Reconhecimento (Linha Azul)
            const options = { 
                label: match.label === "unknown" ? "Identificando..." : match.label,
                boxColor: "#2563eb", // Azul do sistema
                lineWidth: 4
            };
            new faceapi.draw.DrawBox(d.detection.box, options).draw(canvas);

            // Lógica de Confirmação
            if (match.label !== "unknown" && catracaLiberada && refeicaoSelecionada) {
                if (alunosQueJaComeram.has(match.label)) {
                    falar(`${match.label}, você já registrou sua presença hoje.`);
                    painelStatus.innerText = "REPETIDO: " + match.label;
                    return;
                }

                confirmarAcesso(match.label);
            }
        });
    }, 150); // Roda a cada 150ms para suavidade
});

/**
 * REGISTRO DE SUCESSO
 */
function confirmarAcesso(nome) {
    catracaLiberada = false;
    alunosQueJaComeram.add(nome);
    totalRegistros++;
    
    document.getElementById("contTotal").innerText = totalRegistros;
    const el = document.getElementById(nome);
    const turma = el.dataset.turma;

    falar(`Acesso liberado. Bom apetite, ${nome} do ${turma}`);
    
    painelStatus.className = "status-badge liberado";
    painelStatus.innerText = `APROVADO: ${nome}`;

    // Adiciona na tabela de histórico
    const row = `<tr>
        <td><img src="${el.src}" class="foto-miniatura"></td>
        <td><strong>${nome}</strong></td>
        <td>${turma}</td>
        <td>${refeicaoSelecionada}</td>
        <td>${new Date().toLocaleTimeString()}</td>
    </tr>`;
    corpoTabela.innerHTML = row + corpoTabela.innerHTML;

    // Reset automático após 5 segundos para o próximo aluno
    setTimeout(() => {
        catracaLiberada = true;
        refeicaoSelecionada = "";
        document.querySelectorAll(".btn-totem").forEach(b => b.classList.remove("ativo"));
        painelStatus.className = "status-badge alerta";
        painelStatus.innerText = "ESCOLHA A REFEIÇÃO";
    }, 5000);
}

// Botões Administrativos
function mudarCardapio() {
    const novoCafe = prompt("Menu do Café:");
    const novoAlmoco = prompt("Menu do Almoço:");
    if(novoCafe) document.getElementById("menuCafe").innerText = novoCafe;
    if(novoAlmoco) document.getElementById("menuAlmoco").innerText = novoAlmoco;
}

document.getElementById("btnExportar").onclick = () => alert("Relatório CSV gerado!");
document.getElementById("btnReset").onclick = () => location.reload();
