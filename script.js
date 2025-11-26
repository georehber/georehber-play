// =====================================================
//               GLOBAL DEĞİŞKENLER
// =====================================================

let quizData = null;
let levelProgress = JSON.parse(localStorage.getItem("levelProgress") || "{}");
let username = localStorage.getItem("username") || "";

let currentLevel = null;
let questionSet = [];
let currentQuestionIndex = 0;
let score = 0;
let questionById = {}; // id -> soru objesi


// =====================================================
//          KULLANICI ADI / LOCALSTORAGE YARDIMCI
// =====================================================

function getUserKey() {
    const u = username || localStorage.getItem("username") || "";
    return "levelQuestions_" + u;
}

function loadUserLevelQuestions() {
    const key = getUserKey();
    try {
        return JSON.parse(localStorage.getItem(key) || "{}");
    } catch (e) {
        return {};
    }
}

function saveUserLevelQuestions(map) {
    const key = getUserKey();
    localStorage.setItem(key, JSON.stringify(map));
}


// =====================================================
//                SAYFA YÜKLENİNCE
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    const usernameInput = document.getElementById("usernameInput");
    const startBtn = document.getElementById("startBtn");
    const akarsularCard = document.getElementById("cat-akarsular");

    if (usernameInput && startBtn) {
        if (username) {
            usernameInput.value = username;
            startBtn.classList.remove("disabled");
            if (akarsularCard) akarsularCard.classList.remove("disabled-cat");
        }

        usernameInput.addEventListener("input", () => {
            const val = usernameInput.value.trim();
            if (val.length > 0) {
                startBtn.classList.remove("disabled");
                if (akarsularCard) akarsularCard.classList.remove("disabled-cat");
            } else {
                startBtn.classList.add("disabled");
                if (akarsularCard) akarsularCard.classList.add("disabled-cat");
            }
        });

        startBtn.addEventListener("click", () => {
            if (startBtn.classList.contains("disabled")) return;

            username = usernameInput.value.trim();
            localStorage.setItem("username", username);
            window.location.href = "akarsular.html";
        });
    }

    if (path.includes("akarsular.html")) {
        initAkarsularPage();
    }
});


// =====================================================
//            AKARSULAR SAYFASINI BAŞLAT
// =====================================================

async function initAkarsularPage() {
    quizData = await fetch("sorular.json").then(r => r.json());

    questionById = {};
    quizData.questions.forEach(q => {
        questionById[q.id] = q;
    });

    if (!levelProgress["1"]) {
        levelProgress["1"] = true;
        saveProgress();
    }

    buildLevelScreen();
    showLevelScreen();

    const returnBtn = document.getElementById("returnBtn");
    if (returnBtn) {
        returnBtn.addEventListener("click", () => {
            showLevelScreen();
        });
    }

    const nextBtn = document.getElementById("nextBtn");
    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (nextBtn.classList.contains("disabled")) return;

            removeOldMessages();

            if (currentQuestionIndex < questionSet.length - 1) {
                currentQuestionIndex++;
                loadQuestion();
            } else {
                finishLevel();
            }
        });
    }
}


// =====================================================
//            LEVEL SEÇİM EKRANINI OLUŞTUR
// =====================================================

function buildLevelScreen() {
    const levelList = document.getElementById("levelList");
    if (!levelList) return;

    levelList.innerHTML = "";

    for (let i = 1; i <= 10; i++) {
        const unlocked = levelProgress[i] === true;

        const card = document.createElement("div");
        card.classList.add("level-card");

        if (!unlocked) {
            card.classList.add("locked");
        } else {
            if (levelProgress[i] === true && levelProgress[i + 1] === true) {
                card.classList.add("completed");
            } else {
                card.classList.add("unlocked");
            }
        }

        card.innerHTML = `
            <span class="level-text">Seviye ${i}</span>
            <span class="level-status"></span>
        `;

        if (unlocked) {
            card.addEventListener("click", () => {
                startLevel(i);
                showQuizScreen();
            });
        }

        levelList.appendChild(card);
    }
}


// =====================================================
//                   LEVEL BAŞLAT
// =====================================================

function startLevel(level) {
    currentLevel = level;
    currentQuestionIndex = 0;
    score = 0;

    const scoreSpan = document.getElementById("scoreValue");
    if (scoreSpan) scoreSpan.textContent = score;

    let levelQuestions = loadUserLevelQuestions();
    let ids;

    if (levelQuestions[level]) {
        ids = levelQuestions[level];
    } else {
        const all = [...quizData.questions];
        shuffle(all);
        const selected = all.slice(0, 10);
        ids = selected.map(q => q.id);

        levelQuestions[level] = ids;
        saveUserLevelQuestions(levelQuestions);
    }

    questionSet = ids.map(id => questionById[id]).filter(Boolean);

    loadQuestion();
}


// =====================================================
//                  SORU YÜKLE
// =====================================================

function loadQuestion() {
    const q = questionSet[currentQuestionIndex];
    if (!q) return;

    const bar = document.getElementById("progressBar");
    if (bar) {
        const total = questionSet.length;
        const current = currentQuestionIndex;
        const percent = (current / total) * 100;
        bar.style.width = percent + "%";
    }

    removeOldMessages();

    const title = document.getElementById("quizTitle");
    const questionText = document.getElementById("questionText");
    const nextBtn = document.getElementById("nextBtn");
    const container = document.getElementById("choicesContainer");

    if (title) title.textContent = `Seviye ${currentLevel}`;
    if (questionText) questionText.textContent = q.question;
    if (nextBtn) nextBtn.classList.add("disabled");
    if (!container) return;

    container.innerHTML = "";

    q.choices.forEach(choice => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.textContent = choice;

        btn.addEventListener("click", () => selectAnswer(choice));

        container.appendChild(btn);
    });
}


// =====================================================
//             CEVAP SEÇİMİ
// =====================================================

function selectAnswer(choice) {
    const q = questionSet[currentQuestionIndex];
    const buttons = document.querySelectorAll(".choice-btn");
    const nextBtn = document.getElementById("nextBtn");

    buttons.forEach(b => (b.disabled = true));

    buttons.forEach(b => {
        if (b.textContent === q.correct) {
            b.classList.add("correct");
        }
        if (b.textContent === choice && choice !== q.correct) {
            b.classList.add("wrong");
        }
    });

    if (choice === q.correct) {
        score++;
        const scoreSpan = document.getElementById("scoreValue");
        if (scoreSpan) scoreSpan.textContent = score;
        showCorrectMessage();
    } else {
        showWrongExplanation(q.explanation);
    }

    if (nextBtn) nextBtn.classList.remove("disabled");
}


// =====================================================
//     DOĞRU MESAJI (motivasyon)
// =====================================================

function showCorrectMessage() {
    const arr = quizData.correct_messages;
    const msg = arr[Math.floor(Math.random() * arr.length)];

    const box = document.createElement("div");
    box.className = "msg-correct";
    box.textContent = msg;

    document.querySelector(".question-box").appendChild(box);
}


// =====================================================
//     YANLIŞ → SORU AÇIKLAMASINI GÖSTER
// =====================================================

function showWrongExplanation(text) {
    const box = document.createElement("div");
    box.className = "msg-wrong";
    box.textContent = text;

    document.querySelector(".question-box").appendChild(box);
}


// =====================================================
//   Önceki mesajları temizle (Yeni soruda üst üste binmesin)
// =====================================================

function removeOldMessages() {
    document.querySelectorAll(".msg-correct, .msg-wrong").forEach(el => el.remove());
}



// =====================================================
//                LEVEL TAMAMLAMA
// =====================================================

function finishLevel() {
    if (score === questionSet.length) {
        alert("Tebrikler! Bu seviyeyi tamamladın!");

        const next = currentLevel + 1;

        if (next <= 10) {
            levelProgress[next] = true;
            saveProgress();
        }

        showLevelScreen();
        buildLevelScreen();
    } else {
        alert("Tüm soruları doğru yapamadın. Aynı setle tekrar deneyebilirsin!");
        currentQuestionIndex = 0;
        score = 0;
        const scoreSpan = document.getElementById("scoreValue");
        if (scoreSpan) scoreSpan.textContent = score;
        loadQuestion();
    }
}


// =====================================================
//                EKRAN GEÇİŞLERİ
// =====================================================

function showQuizScreen() {
    document.getElementById("levelSelectScreen").classList.add("hidden");
    document.getElementById("quizScreen").classList.remove("hidden");
}

function showLevelScreen() {
    document.getElementById("levelSelectScreen").classList.remove("hidden");
    document.getElementById("quizScreen").classList.add("hidden");
}


// =====================================================
//             LOCAL STORAGE KAYDETME
// =====================================================

function saveProgress() {
    localStorage.setItem("levelProgress", JSON.stringify(levelProgress));
}


// =====================================================
//                 SHUFFLE FONKSİYONU
// =====================================================

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}
