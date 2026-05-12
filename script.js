const video = document.getElementById("videoEscola");
const container = document.getElementById("containerVideo");
const painelStatus = document.getElementById("statusCatraca");
const corpoTabela = document.getElementById("corpoTabela");
const btnLigar = document.getElementById("btnLigar");
const btnReset = document.getElementById("btnReset");

let comparadorDeRostos; 
let catracaLiberada = true; 
const alunosQueJaComeram = new Set(); // Nossa lista de controle

// Adicione aqui os nomes das fotos cadastradas
const LISTA_ALUNOS = ["Kaio"]; 

// Função de Bipe
function tocarBipe(tipo) {
    const contexto = new (window.AudioContext || window.webkitAudioContext)();
    const osc = contexto.createOscillator();
    osc.type = 'sine';
    // Se for sucesso, som agudo. Se já comeu, som grave.
    osc.frequency.setValueAtTime(tipo === 'erro' ? 220 : 880, contexto.currentTime);
    osc.connect(contexto.destination);
    osc.start();
    osc.stop(contexto.currentTime + 0.2);
}

// Inicializar IA
async function iniciarIA() {
    const URL_MODELOS = 'https://vladmandic.github.io/face-api/model/';
    await faceapi.nets.tinyFaceDetector.loadFromUri(URL_MODELOS);
    await faceapi.nets.faceLandmark68Net.loadFromUri(URL_MODELOS);
    await faceapi.nets.faceRecognitionNet.loadFromUri(URL_MODELOS);

    const descritores = await Promise.all(LISTA_ALUNOS.map(async nome => {
        const img = document.getElementById(nome);
        const detec = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        return new faceapi.LabeledFaceDescriptors(nome, [detec.descriptor]);
    }));

    comparadorDeRostos = new faceapi.FaceMatcher(descritores, 0.45);
    painelStatus.innerText = "SISTEMA PRONTO";
}

iniciarIA();

// Ligar Câmera
btnLigar.addEventListener("click", async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
});

// Resetar Lista
btnReset.addEventListener("click", () => {
    alunosQueJaComeram.clear();
    corpoTabela.innerHTML = "";
    alert("Lista de refeições zerada!");
});

video.addEventListener("play", () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    container.append(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        const resized = faceapi.resizeResults(detections, displaySize);
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        resized.forEach(det => {
            const result = comparadorDeRostos.findBestMatch(det.descriptor);
            const label = result.toString();
            new faceapi.draw.DrawBox(det.detection.box, { label }).draw(canvas);

            if (result.label !== "unknown" && catracaLiberada) {
                
                if (alunosQueJaComeram.has(result.label)) {
                    // JÁ COMEU
                    painelStatus.className = "status alerta";
                    painelStatus.innerText = "REFEIÇÃO JÁ REGISTRADA: " + result.label.toUpperCase();
                    tocarBipe('erro');
                } else {
                    // LIBERADO PRIMEIRA VEZ
                    catracaLiberada = false;
                    alunosQueJaComeram.add(result.label);
                    
                    painelStatus.className = "status liberado";
                    painelStatus.innerText = "BOM APETITE, " + result.label.toUpperCase();
                    
                    tocarBipe('sucesso');
                    
                    // Adiciona na tabela
                    const row = `<tr><td><strong>${result.label}</strong></td><td>${new Date().toLocaleTimeString()}</td><td><span class="tag-sucesso">CONFIRMADO</span></td></tr>`;
                    corpoTabela.innerHTML = row + corpoTabela.innerHTML;

                    setTimeout(() => {
                        catracaLiberada = true;
                        painelStatus.className = "status bloqueado";
                        painelStatus.innerText = "AGUARDANDO PRÓXIMO...";
                    }, 5000);
                }
            }
        });
    }, 100);
});
