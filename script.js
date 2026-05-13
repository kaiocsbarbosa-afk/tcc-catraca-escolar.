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
const LISTA_ALUNOS = ["Kaio"]; // Adicione o ID da foto aqui
let refeicaoSelecionada = "";

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

// Botões de refeição
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

// --- FUNÇÃO DE ÁUDIO (Bipes Sintetizados) ---
function tocarSom(tipo) {
    const contexto = new (window.AudioContext || window.webkitAudioContext)();
    const oscilador = contexto.createOscillator();
    const ganho = contexto.createGain();

    oscilador.connect(ganho);
    ganho.connect(contexto.destination);

    if (tipo === 'sucesso') {
        oscilador.frequency.setValueAtTime(880, contexto.currentTime); // Som agudo
        oscilador.type = 'sine';
        ganho.gain.setValueAtTime(0.1, contexto.currentTime);
        oscilador.start();
        oscilador.stop(contexto.currentTime + 0.2);
    } else if (tipo === 'erro') {
        oscilador.frequency.setValueAtTime(220, contexto.currentTime); // Som grave/alerta
        oscilador.type = 'square';
        ganho.gain.setValueAtTime(0.05, contexto.currentTime);
        oscilador.start();
        oscilador.stop(contexto.currentTime + 0.4);
    }
}

// Mantenha seu iniciarIA() e o evento do btnLigar...
// ...

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
                // Caso esqueça de escolher a refeição
                if (refeicaoSelecionada === "") {
                    if (painelStatus.innerText !== "ESCOLHA A REFEIÇÃO PRIMEIRO!") {
                        tocarSom('erro'); 
                        painelStatus.className = "status bloqueado";
                        painelStatus.innerText = "ESCOLHA A REFEIÇÃO PRIMEIRO!";
                    }
                    return;
                }

                // Caso o aluno tente passar duas vezes
                if (alunosQueJaComeram.has(result.label)) {
                    if (painelStatus.innerText !== "JÁ REGISTRADO: " + result.label.toUpperCase()) {
                        tocarSom('erro');
                        painelStatus.className = "status alerta";
                        painelStatus.innerText = "JÁ REGISTRADO: " + result.label.toUpperCase();
                    }
                } else {
                    // SUCESSO!
                    catracaLiberada = false;
                    alunosQueJaComeram.add(result.label);
                    
                    tocarSom('sucesso'); // Bip de confirmação
                    
                    const elementoImg = document.getElementById(result.label);
                    atualizarContadores(refeicaoSelecionada);

                    const row = `<tr>
                        <td><img src="${elementoImg.src}" class="foto-miniatura"></td>
                        <td><strong>${result.label}</strong></td>
                        <td>${elementoImg.dataset.turma}</td>
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
