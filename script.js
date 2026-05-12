const botao = document.getElementById("btnLigar");
const video = document.getElementById("videoEscola");
const container = document.getElementById("containerVideo");
const painelStatus = document.getElementById("statusCatraca");
const corpoTabela = document.getElementById("corpoTabela");

let comparadorDeRostos; 
let catracaLiberada = true; 

// --- NOVO: LISTA DE ALUNOS QUE JÁ CONFIRMARAM ---
const alunosQueJaComeram = new Set(); 

const LISTA_ALUNOS = ["Kaio"]; 

function tocarBipe() {
    const contextoAudio = new (window.AudioContext || window.webkitAudioContext)();
    const oscilador = contextoAudio.createOscillator();
    oscilador.type = 'sine';
    oscilador.frequency.setValueAtTime(880, contextoAudio.currentTime);
    oscilador.connect(contextoAudio.destination);
    oscilador.start();
    oscilador.stop(contextoAudio.currentTime + 0.2); 
}

function registrarNoHistorico(nome) {
    const hora = new Date().toLocaleTimeString('pt-BR');
    const novaLinha = document.createElement("tr");
    novaLinha.innerHTML = `
        <td><strong>${nome}</strong></td>
        <td>${hora}</td>
        <td><span class="tag-sucesso">CONFIRMADO</span></td>
    `;
    corpoTabela.insertBefore(novaLinha, corpoTabela.firstChild);
}

async function carregarSistema() {
    const urlModelos = 'https://vladmandic.github.io/face-api/model/';
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(urlModelos),
        faceapi.nets.faceLandmark68Net.loadFromUri(urlModelos),
        faceapi.nets.faceRecognitionNet.loadFromUri(urlModelos)
    ]);

    try {
        const descritoresPromessas = LISTA_ALUNOS.map(async nome => {
            const img = document.getElementById(nome);
            const deteccao = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
            return new faceapi.LabeledFaceDescriptors(nome, [deteccao.descriptor]);
        });

        const listaDeRostosCadastrados = await Promise.all(descritoresPromessas);
        comparadorDeRostos = new faceapi.FaceMatcher(listaDeRostosCadastrados, 0.45); 
        
        painelStatus.innerText = "SISTEMA PRONTO";
    } catch (erro) {
        alert("Erro ao carregar fotos.");
    }
}

carregarSistema();

botao.addEventListener("click", async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
});

video.addEventListener("play", () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    container.append(canvas);
    const tamanho = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, tamanho);

    setInterval(async () => {
        if (!comparadorDeRostos) return; 

        const rostosWebcam = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
        const rostosAjustados = faceapi.resizeResults(rostosWebcam, tamanho);
        const resultados = rostosAjustados.map(rosto => comparadorDeRostos.findBestMatch(rosto.descriptor));

        resultados.forEach((resultado, i) => {
            const caixa = rostosAjustados[i].detection.box;
            new faceapi.draw.DrawBox(caixa, { label: resultado.toString() }).draw(canvas);

            if (resultado.label !== "unknown" && catracaLiberada) {
                
                // --- VERIFICAÇÃO DE DUPLICIDADE ---
                if (alunosQueJaComeram.has(resultado.label)) {
                    // Se o aluno já confirmou antes:
                    painelStatus.className = "status bloqueado"; // Fica laranja ou vermelho
                    painelStatus.style.backgroundColor = "#ff9800"; // Cor de alerta (Laranja)
                    painelStatus.innerText = "REFEIÇÃO JÁ REGISTRADA: " + resultado.label.toUpperCase();
                } else {
                    // Se é a primeira vez do aluno:
                    catracaLiberada = false;
                    alunosQueJaComeram.add(resultado.label); // Adiciona na lista de confirmados
                    
                    painelStatus.className = "status liberado";
                    painelStatus.style.backgroundColor = "#34a853";
                    painelStatus.innerText = "BOM APETITE, " + resultado.label.toUpperCase();
                    
                    tocarBipe();
                    registrarNoHistorico(resultado.label);

                    setTimeout(() => {
                        catracaLiberada = true;
                        painelStatus.style.backgroundColor = ""; // Volta ao CSS original
                    }, 4000);
                }
            }
        });
    }, 100);
});
