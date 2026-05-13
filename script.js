const video = document.getElementById("videoEscola");
const container = document.getElementById("containerVideo");
const painelStatus = document.getElementById("statusCatraca");
const corpoTabela = document.getElementById("corpoTabela");

const LISTA_ALUNOS = ["Kaio"]; // Adicione os nomes exatamente como o ID das fotos no HTML
let comparadorDeRostos;
let catracaLiberada = true;
let refeicaoSelecionada = "";
const alunosQueJaComeram = new Set();
let counts = { cafe: 0, almoco: 0 };

async function iniciarAutomatico() {
    try {
        await carregarModelos();
        await ligarCamera();
    } catch (err) {
        painelStatus.innerText = "ERRO AO INICIAR SISTEMA";
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
    painelStatus.innerText = "SISTEMA PRONTO! ESCOLHA A OPÇÃO.";
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

// Eventos de Botões
document.querySelectorAll(".btn-totem").forEach(btn => {
    btn.addEventListener("click", (e) => {
        refeicaoSelecionada = e.target.innerText;
        document.querySelectorAll(".btn-totem").forEach(b => b.classList.remove("ativo"));
        e.target.classList.add("ativo");
        painelStatus.className = "status alerta";
        painelStatus.innerText = "IDENTIFICANDO ROSTO...";
        falar("Por favor, olhe para a câmera.");
    });
});

video.addEventListener("play", () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    container.append(canvas);
    
    // Sincroniza o tamanho do desenho com o tamanho real do vídeo na tela
    const displaySize = { width: video.offsetWidth, height: video.offsetHeight };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detec = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        const resized = faceapi.resizeResults(detec, displaySize);
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        resized.forEach(d => {
            const match = comparadorDeRostos.findBestMatch(d.descriptor);
            
            // Conserto da Linha Azul: Cores e Estilo
            const drawBox = new faceapi.draw.DrawBox(d.detection.box, { 
                label: match.label, 
                boxColor: '#2563eb', // Azul da interface
                lineWidth: 3
            });
            drawBox.draw(canvas);

            if (match.label !== "unknown" && catracaLiberada && refeicaoSelecionada) {
                if (alunosQueJaComeram.has(match.label)) {
                    painelStatus.innerText = "JÁ REGISTRADO: " + match.label;
                    falar(match.label + ", você já retirou sua refeição hoje.");
                    refeicaoSelecionada = "";
                    return;
                }

                catracaLiberada = false;
                alunosQueJaComeram.add(match.label);
                
                const el = document.getElementById(match.label);
                const turma = el.dataset.turma;

                falar("Acesso liberado. Bom apetite, " + match.label);
                
                // Atualiza contadores
                if(refeicaoSelecionada.includes("CAFÉ")) counts.cafe++;
                else if(refeicaoSelecionada.includes("ALMOÇO")) counts.almoco++;
                else { counts.cafe++; counts.almoco++; }
                
                document.getElementById("contCafe").innerText = counts.cafe;
                document.getElementById("contAlmoco").innerText = counts.almoco;
                document.getElementById("contTotal").innerText = counts.cafe + counts.almoco;

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

                setTimeout(() => {
                    catracaLiberada = true;
                    refeicaoSelecionada = "";
                    document.querySelectorAll(".btn-totem").forEach(b => b.classList.remove("ativo"));
                    painelStatus.className = "status bloqueado";
                    painelStatus.innerText = "ESCOLHA A OPÇÃO";
                }, 5000);
            }
        });
    }, 150);
});

function mudarCardapio() {
    const novo = prompt("Digite o novo prato do dia:");
    if(novo) document.getElementById("textoCardapio").innerText = novo;
}

document.getElementById("btnExportar").addEventListener("click", () => {
    let csv = "Nome,Turma,Refeicao,Hora\n";
    corpoTabela.querySelectorAll("tr").forEach(tr => {
        const td = tr.querySelectorAll("td");
        csv += `${td[1].innerText},${td[2].innerText},${td[3].innerText},${td[4].innerText}\n`;
    });
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'merenda_diaria.csv';
    a.click();
});
