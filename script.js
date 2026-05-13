const video = document.getElementById("videoEscola");
const container = document.getElementById("containerVideo");
const painelStatus = document.getElementById("statusCatraca");

const LISTA_ALUNOS = ["Kaio"]; // Mantenha atualizado com os IDs do HTML
let comparador;
let ocupado = false;
let refeicao = "";
let total = 0;

// Configurar Cardápio Inicial
document.getElementById("menuCafe").innerText = "Pão com Ovo e Leite";
document.getElementById("menuAlmoco").innerText = "Feijoada com Farofa";

async function iniciarTotem() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        video.srcObject = stream;
        
        painelStatus.innerText = "CARREGANDO IA...";
        const MODEL_URL = 'https://vladmandic.github.io/face-api/model/';
        
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        await treinarIA();
        painelStatus.innerText = "TOQUE EM UMA OPÇÃO";
        painelStatus.className = "status-badge aguardando";
    } catch (e) {
        painelStatus.innerText = "ERRO DE CÂMERA";
    }
}

async function treinarIA() {
    const labels = await Promise.all(LISTA_ALUNOS.map(async nome => {
        const img = document.getElementById(nome);
        const detec = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        return new faceapi.LabeledFaceDescriptors(nome, [detec.descriptor]);
    }));
    comparador = new faceapi.FaceMatcher(labels, 0.5); // 0.5 é um meio termo bom para reconhecimento
}

function falar(texto) {
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(texto);
    voz.lang = 'pt-BR';
    voz.rate = 0.9; // Velocidade mais natural
    voz.pitch = 1;  // Tom natural
    window.speechSynthesis.speak(voz);
}

function selecionar(tipo) {
    refeicao = tipo;
    painelStatus.innerText = "OLHE PARA A CÂMERA";
    painelStatus.className = "status-badge identificando";
    falar("Opção " + tipo + " selecionada. Por favor, aproxime o seu rosto.");
}

video.addEventListener("play", () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    container.append(canvas);
    const displaySize = { width: video.offsetWidth, height: video.offsetHeight };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        if (ocupado || !refeicao) return;

        const detecções = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        const resized = faceapi.resizeResults(detecções, displaySize);
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        resized.forEach(d => {
            const match = comparador.findBestMatch(d.descriptor);
            
            // Linha azul mais visível
            new faceapi.draw.DrawBox(d.detection.box, { 
                label: match.label, 
                boxColor: '#3b82f6',
                lineWidth: 4 
            }).draw(canvas);

            if (match.label !== "unknown") {
                confirmar(match.label);
            }
        });
    }, 200);
});

function confirmar(nome) {
    ocupado = true;
    total++;
    document.getElementById("contTotal").innerText = total;
    
    const alunoImg = document.getElementById(nome);
    const turma = alunoImg.dataset.turma;

    painelStatus.innerText = "LIBERADO: " + nome;
    painelStatus.className = "status-badge sucesso";
    
    falar("Acesso confirmado. Bom apetite " + nome + " do " + turma);

    setTimeout(() => {
        ocupado = false;
        refeicao = "";
        painelStatus.innerText = "TOQUE EM UMA OPÇÃO";
        painelStatus.className = "status-badge aguardando";
    }, 5000); // Espera 5 segundos para o próximo
}
