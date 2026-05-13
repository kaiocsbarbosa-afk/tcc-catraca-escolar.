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
const LISTA_ALUNOS = ["Kaio"]; // Adicione mais nomes aqui conforme cadastrar fotos
let refeicaoSelecionada = "";

let totalCafe = 0;
let totalAlmoco = 0;

// --- FUNÇÃO DE VOZ ---
function falar(texto) {
    window.speechSynthesis.cancel();
    const mensagem = new SpeechSynthesisUtterance(texto);
    mensagem.lang = 'pt-BR';
    mensagem.rate = 1.2;
    window.speechSynthesis.speak(mensagem);
}

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

// Inicializar Modelos da IA
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

// Controles de Câmera e Relatório
btnLigar.addEventListener("click", async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
});

btnReset.addEventListener("click", () => {
    if(confirm("Deseja zerar a lista e os contadores?")) {
        alunosQueJaComeram.clear();
        corpoTabela.innerHTML = "";
        totalCafe = 0; totalAlmoco = 0;
        spanCafe.innerText = "0"; spanAlmoco.innerText = "0"; spanTotal.innerText = "0";
        falar("Sistema reiniciado.");
    }
});

btnExportar.addEventListener("click", () => {
    if (alunosQueJaComeram.size === 0) return alert("Nenhum registro.");
    let csv = "Nome,Turma,Refeicao,Horario\n";
    corpoTabela.querySelectorAll("tr").forEach(linha => {
        const col = linha.querySelectorAll("td");
        csv += `${col[1].innerText},${col[2].innerText},${col[3].innerText},${col[4].innerText}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "relatorio_merenda.csv";
    link.click();
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
                    if (painelStatus.innerText !== "ESCOLHA A REFEIÇÃO PRIMEIRO!") {
                        falar("Por favor, selecione sua refeição primeiro.");
                        painelStatus.className = "status bloqueado";
                        painelStatus.innerText = "ESCOLHA A REFEIÇÃO PRIMEIRO!";
                    }
                    return;
                }

                if (alunosQueJaComeram.has(result.label)) {
                    if (painelStatus.innerText !== "JÁ REGISTRADO: " + result.label.toUpperCase()) {
                        falar("Atenção, " + result.label + ". Você já registrou sua merenda.");
                        painelStatus.className = "status alerta";
                        painelStatus.innerText = "JÁ REGISTRADO: " + result.label.toUpperCase();
                    }
                } else {
                    catracaLiberada = false;
                    alunosQueJaComeram.add(result.label);
                    
                    const elementoImg = document.getElementById(result.label);
                    const turma = elementoImg.dataset.turma;
                    
                    falar("Acesso liberado. Bom apetite, " + result.label + " do " + turma);
                    atualizarContadores(refeicaoSelecionada);

                    const row = `<tr>
                        <td><img src="${elementoImg.src}" class="foto-miniatura"></td>
                        <td><strong>${result.label}</strong></td>
                        <td>${turma}</td>
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
                    }, 5000);
                }
            }
        });
    }, 100);
});
