// Seletores de Elementos
const video = document.getElementById("videoEscola");
const container = document.getElementById("containerVideo");
const painelStatus = document.getElementById("statusCatraca");
const corpoTabela = document.getElementById("corpoTabela");
const spans = {
    cafe: document.getElementById("contCafe"),
    almoco: document.getElementById("contAlmoco"),
    total: document.getElementById("contTotal")
};

// Configurações de Estado
let comparadorDeRostos;
let catracaLiberada = true;
let refeicaoSelecionada = "";
const alunosQueJaComeram = new Set();
const LISTA_ALUNOS = ["Kaio"]; // Adicione novos IDs aqui
let counts = { cafe: 0, almoco: 0 };

// --- FUNÇÕES DE APOIO ---

function falar(texto) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(texto);
    msg.lang = 'pt-BR';
    msg.rate = 1.1;
    window.speechSynthesis.speak(msg);
}

function atualizarInterfaceContadores(tipo) {
    if (tipo.includes("Café")) counts.cafe++;
    if (tipo.includes("Almoço")) counts.almoco++;
    
    spans.cafe.innerText = counts.cafe;
    spans.almoco.innerText = counts.almoco;
    spans.total.innerText = counts.cafe + counts.almoco;
}

// --- LOGICA DE IA ---

async function carregarModelos() {
    const URL = 'https://vladmandic.github.io/face-api/model/';
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(URL)
    ]);

    const descritores = await Promise.all(LISTA_ALUNOS.map(async nome => {
        const img = document.getElementById(nome);
        const d = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                                .withFaceLandmarks().withFaceDescriptor();
        return new faceapi.LabeledFaceDescriptors(nome, [d.descriptor]);
    }));

    comparadorDeRostos = new faceapi.FaceMatcher(descritores, 0.45);
    painelStatus.innerText = "SISTEMA PRONTO!";
}

carregarModelos();

// --- EVENTOS ---

document.querySelectorAll(".btn-opcao").forEach(btn => {
    btn.addEventListener("click", (e) => {
        refeicaoSelecionada = e.target.innerText;
        document.querySelectorAll(".btn-opcao").forEach(b => b.classList.remove("ativo"));
        e.target.classList.add("ativo");
        painelStatus.className = "status alerta";
        painelStatus.innerText = "SISTEMA AGUARDANDO ROSTO...";
    });
});

document.getElementById("btnLigar").addEventListener("click", async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
});

document.getElementById("btnReset").addEventListener("click", () => {
    if(confirm("Reiniciar turno?")) location.reload();
});

document.getElementById("btnExportar").addEventListener("click", () => {
    let csv = "Nome,Turma,Refeicao,Horario\n";
    corpoTabela.querySelectorAll("tr").forEach(tr => {
        const td = tr.querySelectorAll("td");
        csv += `${td[1].innerText},${td[2].innerText},${td[3].innerText},${td[4].innerText}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio_merenda.csv";
    a.click();
});

// --- RECONHECIMENTO EM TEMPO REAL ---

video.addEventListener("play", () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    container.append(canvas);
    const dim = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, dim);

    setInterval(async () => {
        const detec = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                                   .withFaceLandmarks().withFaceDescriptors();
        const resized = faceapi.resizeResults(detec, dim);
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        resized.forEach(d => {
            const match = comparadorDeRostos.findBestMatch(d.descriptor);
            new faceapi.draw.DrawBox(d.detection.box, { label: match.toString() }).draw(canvas);

            if (match.label !== "unknown" && catracaLiberada) {
                if (!refeicaoSelecionada) {
                    painelStatus.innerText = "SELECIONE A REFEIÇÃO!";
                    return;
                }

                if (alunosQueJaComeram.has(match.label)) {
                    painelStatus.className = "status alerta";
                    painelStatus.innerText = "JÁ REGISTRADO: " + match.label;
                } else {
                    catracaLiberada = false;
                    alunosQueJaComeram.add(match.label);
                    
                    const el = document.getElementById(match.label);
                    const turma = el.dataset.turma;

                    falar(`Liberado. Bom apetite ${match.label} do ${turma}`);
                    atualizarInterfaceContadores(refeicaoSelecionada);

                    const row = `<tr>
                        <td><img src="${el.src}" class="foto-miniatura"></td>
                        <td>${match.label}</td>
                        <td>${turma}</td>
                        <td>${refeicaoSelecionada}</td>
                        <td>${new Date().toLocaleTimeString()}</td>
                        <td><span class="tag-sucesso">OK</span></td>
                    </tr>`;
                    corpoTabela.innerHTML = row + corpoTabela.innerHTML;

                    painelStatus.className = "status liberado";
                    painelStatus.innerText = "BEM-VINDO, " + match.label;

                    setTimeout(() => {
                        catracaLiberada = true;
                        refeicaoSelecionada = "";
                        document.querySelectorAll(".btn-opcao").forEach(b => b.classList.remove("ativo"));
                        painelStatus.className = "status bloqueado";
                        painelStatus.innerText = "AGUARDANDO PRÓXIMO...";
                    }, 5000);
                }
            }
        });
    }, 150);
});
