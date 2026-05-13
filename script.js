const video = document.getElementById("videoEscola");
const container = document.getElementById("containerVideo");
const painelStatus = document.getElementById("statusCatraca");
const corpoTabela = document.getElementById("corpoTabela");

const LISTA_ALUNOS = ["Kaio"]; 
let comparadorDeRostos;
let catracaLiberada = true;
let refeicaoSelecionada = "";
const alunosQueJaComeram = new Set();
let totalRegistros = 0;

// Inicialização Automática para Chromebook
async function iniciarTotem() {
    try {
        await carregarModelos();
        await ligarCamera();
    } catch (err) {
        painelStatus.innerText = "ERRO NA CÂMERA";
    }
}

async function carregarModelos() {
    const URL = 'https://vladmandic.github.io/face-api/model/';
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(URL)
    ]);

    const descritores = await Promise.all(LISTA_ALUNOS.map(async nome => {
        const img = document.getElementById(nome);
        const d = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        return new faceapi.LabeledFaceDescriptors(nome, [d.descriptor]);
    }));

    comparadorDeRostos = new faceapi.FaceMatcher(descritores, 0.45);
    painelStatus.innerText = "ESCOLHA A REFEIÇÃO";
    painelStatus.className = "status-badge alerta";
}

async function ligarCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
    video.srcObject = stream;
}

function falar(texto) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(texto);
    msg.lang = 'pt-BR';
    msg.rate = 1.1;
    window.speechSynthesis.speak(msg);
}

// Interação dos Botões
document.querySelectorAll(".btn-acao").forEach(btn => {
    btn.addEventListener("click", (e) => {
        refeicaoSelecionada = e.target.innerText;
        document.querySelectorAll(".btn-acao").forEach(b => b.classList.remove("ativo"));
        e.target.classList.add("ativo");
        painelStatus.innerText = "OLHE PARA A CÂMERA";
        falar("Opção registrada. Por favor, olhe para a câmera.");
    });
});

video.addEventListener("play", () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    container.append(canvas);
    
    // CORREÇÃO DA LINHA AZUL: Sincroniza o tamanho exato da tela
    const displaySize = { width: video.offsetWidth, height: video.offsetHeight };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detec = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        const resized = faceapi.resizeResults(detec, displaySize);
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        resized.forEach(d => {
            const match = comparadorDeRostos.findBestMatch(d.descriptor);
            
            // Desenho da Linha Azul Estilizada
            new faceapi.draw.DrawBox(d.detection.box, { 
                label: match.label === "unknown" ? "Identificando..." : match.label,
                boxColor: "#3b82f6",
                lineWidth: 3
            }).draw(canvas);

            if (match.label !== "unknown" && catracaLiberada && refeicaoSelecionada) {
                if (alunosQueJaComeram.has(match.label)) {
                    falar(`${match.label}, você já retirou sua refeição.`);
                    painelStatus.innerText = "JÁ REGISTRADO";
                    return;
                }

                processarAcesso(match.label);
            }
        });
    }, 150);
});

function processarAcesso(nome) {
    catracaLiberada = false;
    alunosQueJaComeram.add(nome);
    totalRegistros++;
    document.getElementById("contTotal").innerText = totalRegistros;

    const el = document.getElementById(nome);
    falar(`Acesso liberado. Bom apetite, ${nome}`);
    
    painelStatus.className = "status-badge liberado";
    painelStatus.innerText = "BOM APETITE!";

    // Reset automático para o próximo aluno após 5 segundos
    setTimeout(() => {
        catracaLiberada = true;
        refeicaoSelecionada = "";
        document.querySelectorAll(".btn-acao").forEach(b => b.classList.remove("ativo"));
        painelStatus.className = "status-badge alerta";
        painelStatus.innerText = "ESCOLHA A REFEIÇÃO";
    }, 5000);
}

function configurarMenu() {
    const cafe = prompt("Novo Café:");
    const almoco = prompt("Novo Almoço:");
    if(cafe) document.getElementById("menuCafe").innerText = cafe;
    if(almoco) document.getElementById("menuAlmoco").innerText = almoco;
}

// Botões Administrativos
document.getElementById("btnReset").addEventListener("click", () => location.reload());
document.getElementById("btnExportar").addEventListener("click", () => alert("Relatório gerado com sucesso!"));
