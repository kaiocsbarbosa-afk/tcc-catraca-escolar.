const video = document.getElementById("videoEscola");
const container = document.getElementById("containerVideo");
const painelStatus = document.getElementById("statusCatraca");
const corpoTabela = document.getElementById("corpoTabela");

const LISTA_ALUNOS = ["Kaio"]; 
let comparadorDeRostos;
let catracaLiberada = true;
let refeicaoSelecionada = "";
const alunosQueJaComeram = new Set();

// Inicia tudo automaticamente
async function iniciarAutomatico() {
    try {
        await carregarModelos();
        await ligarCamera();
        console.log("Sistema de Totem iniciado com sucesso.");
    } catch (err) {
        painelStatus.innerText = "ERRO AO INICIAR CÂMERA";
        console.error(err);
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

    comparadorDeRostos = new faceapi.FaceMatcher(descritores, 0.50);
    painelStatus.innerText = "SISTEMA PRONTO! ESCOLHA A OPÇÃO.";
}

async function ligarCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: 640, height: 480 } 
    });
    video.srcObject = stream;
}

function falar(texto) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(texto);
    msg.lang = 'pt-BR';
    msg.rate = 1.1;
    window.speechSynthesis.speak(msg);
}

// Interação com botões (libera áudio no Chromebook)
document.querySelectorAll(".btn-opcao").forEach(btn => {
    btn.addEventListener("click", (e) => {
        refeicaoSelecionada = e.target.innerText;
        document.querySelectorAll(".btn-opcao").forEach(b => b.classList.remove("ativo"));
        e.target.classList.add("ativo");
        
        painelStatus.className = "status alerta";
        painelStatus.innerText = "OLHE PARA A CÂMERA";
        
        // Ativa o sintetizador de voz (necessário interação inicial no navegador)
        falar("Opção registrada. Por favor, olhe para a câmera.");
    });
});

video.addEventListener("play", () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    container.append(canvas);
    const dim = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, dim);

    setInterval(async () => {
        const detec = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        const resized = faceapi.resizeResults(detec, dim);
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        resized.forEach(d => {
            const match = comparadorDeRostos.findBestMatch(d.descriptor);
            new faceapi.draw.DrawBox(d.detection.box, { label: match.label }).draw(canvas);

            if (match.label !== "unknown" && catracaLiberada && refeicaoSelecionada) {
                
                if (alunosQueJaComeram.has(match.label)) {
                    painelStatus.className = "status alerta";
                    painelStatus.innerText = "REPETIDO: " + match.label;
                    falar(match.label + ", você já retirou sua refeição.");
                    refeicaoSelecionada = ""; // Reseta para evitar loops
                    return;
                }

                catracaLiberada = false;
                alunosQueJaComeram.add(match.label);
                
                const el = document.getElementById(match.label);
                const turma = el.dataset.turma;

                falar("Confirmado. Bom almoço, " + match.label);
                
                // Adiciona na tabela
                const row = `<tr>
                    <td><img src="${el.src}" class="foto-miniatura"></td>
                    <td><strong>${match.label}</strong></td>
                    <td>${turma}</td>
                    <td>${refeicaoSelecionada}</td>
                    <td>${new Date().toLocaleTimeString()}</td>
                </tr>`;
                corpoTabela.innerHTML = row + corpoTabela.innerHTML;

                painelStatus.className = "status liberado";
                painelStatus.innerText = "APROVADO: " + match.label;

                // Reset para o próximo aluno
                setTimeout(() => {
                    catracaLiberada = true;
                    refeicaoSelecionada = "";
                    document.querySelectorAll(".btn-opcao").forEach(b => b.classList.remove("ativo"));
                    painelStatus.className = "status bloqueado";
                    painelStatus.innerText = "ESCOLHA A OPÇÃO";
                }, 4000);
            }
        });
    }, 200);
});
