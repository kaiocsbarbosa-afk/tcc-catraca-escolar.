const botao = document.getElementById("btnLigar");
const video = document.getElementById("videoEscola");
const container = document.getElementById("containerVideo");
const imgAluno = document.getElementById("fotoAluno");
const painelStatus = document.getElementById("statusCatraca");

let comparadorDeRostos; 
let catracaLiberada = true; 

function tocarBipe() {
    const contextoAudio = new (window.AudioContext || window.webkitAudioContext)();
    const oscilador = contextoAudio.createOscillator();
    oscilador.type = 'sine';
    oscilador.frequency.setValueAtTime(880, contextoAudio.currentTime);
    oscilador.connect(contextoAudio.destination);
    oscilador.start();
    oscilador.stop(contextoAudio.currentTime + 0.2); 
}

async function carregarSistema() {
    const urlModelos = 'https://vladmandic.github.io/face-api/model/';
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(urlModelos),
        faceapi.nets.faceLandmark68Net.loadFromUri(urlModelos),
        faceapi.nets.faceRecognitionNet.loadFromUri(urlModelos)
    ]);

    try {
        const deteccaoFoto = await faceapi.detectSingleFace(imgAluno, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        
        if (!deteccaoFoto) return alert("A IA não achou um rosto na foto.");

        const cadastroAluno = new faceapi.LabeledFaceDescriptors("Aluno", [deteccaoFoto.descriptor]);
        comparadorDeRostos = new faceapi.FaceMatcher([cadastroAluno], 0.45); 
        
        alert("Sistema pronto! Pode ligar a câmera.");
    } catch (erro) {
        console.error("Erro na leitura da foto: ", erro);
    }
}

carregarSistema();

botao.addEventListener("click", async function() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (erro) {
        alert("Erro ao ligar a câmera.");
    }
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

        let alunoReconhecido = false;

        resultados.forEach((resultado, i) => {
            const caixa = rostosAjustados[i].detection.box;
            const texto = new faceapi.draw.DrawBox(caixa, { label: resultado.toString() });
            texto.draw(canvas);

            if (resultado.label !== "unknown") {
                alunoReconhecido = true;
            }
        });

        if (alunoReconhecido && catracaLiberada && painelStatus) {
            catracaLiberada = false; 
            const horaAtual = new Date().toLocaleTimeString('pt-BR'); 
            
            // Agora manipulamos as classes do CSS em vez do style direto
            painelStatus.className = "status liberado";
            painelStatus.innerText = "ACESSO LIBERADO: " + horaAtual;
            
            tocarBipe(); 

            setTimeout(() => {
                catracaLiberada = true;
            }, 3000);

        } else if (!alunoReconhecido && catracaLiberada && painelStatus) {
            painelStatus.className = "status bloqueado";
            painelStatus.innerText = "CATRACA BLOQUEADA";
        }

    }, 100);
});
