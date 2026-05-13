// Variáveis Globais
const video = document.getElementById("videoEscola");
const container = document.getElementById("containerVideo");
const painelStatus = document.getElementById("statusCatraca");

const LISTA_ALUNOS = ["Kaio"]; // Mantenha os IDs iguais ao do HTML
let comparador;
let ocupado = false;
let refeicao = "";
let total = 0;
let canvasOverlay;

// Inicia o totem assim que a página carrega completamente
window.onload = iniciarTotem;

async function iniciarTotem() {
    try {
        // Inicia a câmera
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        video.srcObject = stream;
        
        // Carrega os modelos da IA do Face-API
        const MODEL_URL = 'https://vladmandic.github.io/face-api/model/';
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        // Treina a IA com as imagens base
        await treinarIA();
        
        painelStatus.innerText = "TOQUE EM UMA OPÇÃO";
        painelStatus.className = "status-badge aguardando";
    } catch (e) {
        console.error(e);
        painelStatus.innerText = "ERRO: CÂMERA OU SERVIDOR";
        alert("Erro ao iniciar. Certifique-se de estar rodando via Live Server (HTTP) e que a câmera está permitida.");
    }
}

async function treinarIA() {
    const labels = await Promise.all(LISTA_ALUNOS.map(async nome => {
        const img = document.getElementById(nome);
        const detec = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        
        if (!detec) {
            console.warn(`Rosto não encontrado na imagem do aluno: ${nome}`);
            return new faceapi.LabeledFaceDescriptors(nome, [new Float32Array(128)]); // Fallback caso a foto falhe
        }
        return new faceapi.LabeledFaceDescriptors(nome, [detec.descriptor]);
    }));
    comparador = new faceapi.FaceMatcher(labels, 0.5);
}

function falar(texto) {
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(texto);
    voz.lang = 'pt-BR';
    voz.rate = 1.0;
    voz.pitch = 1;
    window.speechSynthesis.speak(voz);
}

function selecionar(tipo) {
    if (ocupado) return;
    refeicao = tipo;
    painelStatus.innerText = "OLHE PARA A CÂMERA";
    painelStatus.className = "status-badge identificando";
    falar("Opção " + tipo + " selecionada. Aproxime o rosto.");
}

// Lógica de Reconhecimento em Tempo Real da Câmera
video.addEventListener("play", () => {
    canvasOverlay = faceapi.createCanvasFromMedia(video);
    container.append(canvasOverlay);
    
    // Ajusta o tamanho do canvas
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvasOverlay, displaySize);

    setInterval(async () => {
        if (ocupado || !refeicao) {
            canvasOverlay.getContext("2d").clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
            return;
        }

        const updatedSize = { width: video.clientWidth, height: video.clientHeight };
        faceapi.matchDimensions(canvasOverlay, updatedSize);

        const detecções = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();
        
        const resized = faceapi.resizeResults(detecções, updatedSize);
        canvasOverlay.getContext("2d").clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);

        resized.forEach(d => {
            const match = comparador.findBestMatch(d.descriptor);
            
            // Desenha o quadrado
            new faceapi.draw.DrawBox(d.detection.box, { 
                label: match.label === "unknown" ? "Desconhecido" : match.label, 
                boxColor: match.label === "unknown" ? '#ef4444' : '#3b82f6',
                lineWidth: 6
            }).draw(canvasOverlay);

            if (match.label !== "unknown") {
                confirmar(match.label);
            }
        });
    }, 300); // Roda a cada 300ms
});

function confirmar(nome) {
    ocupado = true;
    total++;
    document.getElementById("contTotal").innerText = total;
    
    const alunoImg = document.getElementById(nome);
    const turma = alunoImg ? alunoImg.dataset.turma : "";

    painelStatus.innerText = "LIBERADO: " + nome.toUpperCase();
    painelStatus.className = "status-badge sucesso";
    
    falar("Acesso confirmado. Bom apetite " + nome + " do " + turma);

    // Limpa a tela após 4 segundos e reseta
    setTimeout(() => {
        ocupado = false;
        refeicao = "";
        painelStatus.innerText = "TOQUE EM UMA OPÇÃO";
        painelStatus.className = "status-badge aguardando";
        canvasOverlay.getContext("2d").clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
    }, 4000);
}
