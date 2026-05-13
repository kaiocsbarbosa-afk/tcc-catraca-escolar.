const video = document.getElementById("videoEscola");
const container = document.getElementById("containerVideo");
const painelStatus = document.getElementById("statusCatraca");
const corpoTabela = document.getElementById("corpoTabela");

// Elementos dos Contadores
const spanCafe = document.getElementById("contCafe");
const spanAlmoco = document.getElementById("contAlmoco");
const spanTotal = document.getElementById("contTotal");

let comparadorDeRostos; 
let catracaLiberada = true; 
const alunosQueJaComeram = new Set(); 
const LISTA_ALUNOS = ["Kaio"]; 
let refeicaoSelecionada = "";

// Variáveis de contagem
let totalCafe = 0;
let totalAlmoco = 0;

function atualizarContadores(tipo) {
    if (tipo === "Café") totalCafe++;
    if (tipo === "Almoço") totalAlmoco++;
    if (tipo === "Café e Almoço") { totalCafe++; totalAlmoco++; }
    
    spanCafe.innerText = totalCafe;
    spanAlmoco.innerText = totalAlmoco;
    spanTotal.innerText = totalCafe + totalAlmoco;
}

// Lógica dos botões de seleção (mesma de antes)
document.getElementById("btnCafe").addEventListener("click", function() { selecionarOpcao("Café", this); });
document.getElementById("btnAlmoco").addEventListener("click", function() { selecionarOpcao("Almoço", this); });
document.getElementById("btnAmbos").addEventListener("click", function() { selecionarOpcao("Café e Almoço", this); });

function selecionarOpcao(escolha, botao) {
    refeicaoSelecionada = escolha;
    document.querySelectorAll(".btn-opcao").forEach(b => b.classList.remove("ativo"));
    botao.classList.add("ativo");
    painelStatus.innerText = "OPÇÃO SELECIONADA! OLHE PARA A CÂMERA.";
    painelStatus.className = "status alerta";
}

async function iniciarIA() {
    const URL_MODELOS = 'https://vladmandic.github.io/face-api/model/';
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(URL_MODELOS),
        faceapi.nets.faceLandmark68Net.loadFromUri(URL_MODELOS),
        faceapi.nets.faceRecognitionNet.loadFromUri(URL_MODELOS)
    ]);

    const descritores = await Promise.all(LISTA_ALUNOS.map(async nome => {
        const img = document.getElementById(nome);
        const detec = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        return new faceapi.LabeledFaceDescriptors(nome, [detec.descriptor]);
    }));

    comparadorDeRostos = new faceapi.FaceMatcher(descritores, 0.45);
    painelStatus.innerText = "SISTEMA PRONTO. ESCOLHA UMA OPÇÃO.";
}

iniciarIA();

document.getElementById("btnLigar").addEventListener("click", async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
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
            new faceapi.draw.DrawBox(det.detection.box, { label: result.toString() }).draw(canvas);

            if (result.label !== "unknown" && catracaLiberada) {
                if (refeicaoSelecionada === "") {
                    painelStatus.className = "status bloqueado";
                    painelStatus.innerText = "ESCOLHA A REFEIÇÃO PRIMEIRO!";
                    return;
                }

                if (alunosQueJaComeram.has(result.label)) {
                    painelStatus.className = "status alerta";
                    painelStatus.innerText = "JÁ REGISTRADO: " + result.label.toUpperCase();
                } else {
                    catracaLiberada = false;
                    alunosQueJaComeram.add(result.label);
                    
                    // --- AQUI A MÁGICA DA FOTO E DOS CONTADORES ---
                    const caminhoFoto = document.getElementById(result.label).src;
                    atualizarContadores(refeicaoSelecionada);

                    const row = `<tr>
                        <td><img src="${caminhoFoto}" class="foto-miniatura"></td>
                        <td><strong>${result.label}</strong></td>
                        <td>${refeicaoSelecionada}</td>
                        <td>${new Date().toLocaleTimeString()}</td>
                        <td><span class="tag-sucesso">CONFIRMADO</span></td>
                    </tr>`;
                    corpoTabela.innerHTML = row + corpoTabela.innerHTML;

                    painelStatus.className = "status liberado";
                    painelStatus.innerText = "BOM APETITE, " + result.label.toUpperCase();

                    setTimeout(() => {
                        catracaLiberada = true;
                        refeicaoSelecionada = "";
                        document.querySelectorAll(".btn-opcao").forEach(b => b.classList.remove("ativo"));
                        painelStatus.className = "status bloqueado";
                        painelStatus.innerText = "PRÓXIMO: ESCOLHA A REFEIÇÃO";
                    }, 4000);
                }
            }
        });
    }, 100);
});
