
// canvas 크기 초기화
let hasStarted = false;

async function execute(){
    if (hasStarted) return;
    hasStarted = true;

    const canvas = document.getElementById('canvas');

    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const ctx = canvas.getContext('2d');

    const image = new Image();
    const imageReady = new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('image.png을 불러오지 못했습니다.'));
    });
    image.src = './image.png';

    await imageReady;

    const frameDuration = 30
    const slowInterval = 10
    const fastInterval = 5
    const slowN = 128
    const fastN = 64

    for(let [isEfficient, sortGen,sortGenName] of [
        [false, bubbleSort, "BUBBLE 整列"],
        [false, selectionSort, "SELECTION 整列"],
        [false, insertionSort, "INSERTION 整列"],
        [true, mergeSort, "MERGE 整列"],
        [true, quickSort, "QUICK 整列"],
        [true, heapSort, "HEAP 整列"],
        [true, lsdRadixSort, "LSD RADIX 整列"],
    ]){
        const n = isEfficient ? slowN : fastN;
        const interval = isEfficient ? slowInterval : fastInterval;
        //#canvas-label에 function 이름을 출력합니다.
        document.getElementById('canvas-label').innerText = sortGenName;
        const arr = Array.from({ length: n }, (_, i) => i);

        const shuffledArray = await animateSort({
            image, ctx, arr: [...arr], interval:slowInterval, frameDuration, generator: shuffleGenerator,
        });
        await asleep(1000);
        const sortedArray = await animateSort({
            yieldCompare: true, image, ctx, arr: shuffledArray, interval, frameDuration, generator: sortGen,
        });
        await animateSort({
            yieldCompare: true, image, ctx, arr: sortedArray, interval:fastInterval, frameDuration,
            generator: accentGenerator, playStepSound: false,
        });
        if (soundEnabled) {
            try {
                await ensureSortSoundReady();
                if (soundEnabled) await playCompletionSound();
            } catch (error) {
                console.error(error);
            }
        }

    }

    console.log('done');
}


function rearrangeImage({ order, image, ctx, colored = [] }) {
    const canvas = ctx.canvas;
    const segmentCount = order.length;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 원본 이미지에서 필요한 조각을 바로 복사한다. 프레임마다 임시 Canvas를
    // 생성하던 기존 방식보다 메모리 할당과 drawImage 호출이 절반 이하로 줄어든다.
    for (let destinationIndex = 0; destinationIndex < segmentCount; destinationIndex++) {
        const sourceIndex = order[destinationIndex];
        const sourceX = sourceIndex * image.naturalWidth / segmentCount;
        const sourceWidth = image.naturalWidth / segmentCount;
        const destinationX = Math.floor(destinationIndex * canvas.width / segmentCount);
        const destinationEnd = Math.ceil((destinationIndex + 1) * canvas.width / segmentCount);

        ctx.drawImage(
            image,
            sourceX, 0, sourceWidth, image.naturalHeight,
            destinationX, 0, destinationEnd - destinationX, canvas.height
        );
    }

    for (const { indexes, color } of colored) {
        ctx.fillStyle = color;
        indexes.forEach(index => {
            const x = Math.floor(index * canvas.width / segmentCount);
            const end = Math.ceil((index + 1) * canvas.width / segmentCount);
            ctx.fillRect(x, 0, end - x, canvas.height);
        });
    }
}


async function animateSort({ image, ctx, arr, interval, frameDuration, generator, yieldCompare, playStepSound = true }) {
    const workingArray = [...arr];
    const iterator = generator(workingArray, yieldCompare);
    let finalArray = [...workingArray];
    const numStepsPerFrame = Math.ceil(frameDuration / interval);
    const targetFrameDuration = Math.max(frameDuration, interval);
    const maxSteps = 80000;
    let totalSteps = 0;
    let finished = false;

    // 정렬 결과 전체를 큐에 저장하지 않고 한 프레임 분량만 즉시 소비한다.
    while (!finished && totalSteps < maxSteps) {
        const frameStartedAt = performance.now();
        let combinedArray = finalArray;
        let combinedColored = [];
        let combinedSoundIndexes = new Set();
        let hasFrame = false;

        for (let step = 0; step < numStepsPerFrame && totalSteps < maxSteps; step++) {
            const next = iterator.next();

            if (next.done) {
                finished = true;
                if (Array.isArray(next.value)) finalArray = [...next.value];
                break;
            }

            totalSteps++;
            hasFrame = true;

            const {
                array,
                swappedIndexes = [],
                compareIndexes = [],
            } = next.value;

            combinedArray = array;
            finalArray = array;
            combinedColored.push(
                { indexes: compareIndexes, color: 'rgba(255, 0, 0, 0.5)' },
                { indexes: swappedIndexes, color: 'rgba(0, 255, 0, 0.5)' },
            );

            if (step === 0) {
                const soundIndexes = compareIndexes.length === 0 ? swappedIndexes : compareIndexes;
                soundIndexes.forEach(index => combinedSoundIndexes.add(index));
            }
        }

        if (!hasFrame) break;

        rearrangeImage({ order: combinedArray, image, ctx, colored: combinedColored });
        if (playStepSound) {
            playSortSound({ duration: Math.max(frameDuration, interval), n: arr.length, indexes: Array.from(combinedSoundIndexes) });
        }

        // 렌더링에 걸린 시간을 제외한 만큼만 기다려 목표 프레임 속도를 유지한다.
        const renderDuration = performance.now() - frameStartedAt;
        await asleep(Math.max(targetFrameDuration - renderDuration, 0));
    }

    if (!finished && typeof iterator.return === 'function') iterator.return();
    rearrangeImage({ order: finalArray, image, ctx });
    return finalArray;
}


function asleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


let currentAudioSources = [];
let audioCtx;
let sortSoundBuffer;
let sortSoundReady;
let soundEnabled = false;

function ensureSortSoundReady() {
    sortSoundReady ||= prepareSortSound().catch(error => {
        sortSoundReady = undefined;
        throw error;
    });
    return sortSoundReady;
}

async function prepareSortSound() {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume().catch(() => {});

    if (sortSoundBuffer) return;

    const response = await fetch('./laugh.mp3');
    if (!response.ok) {
        throw new Error('laugh.mp3를 불러오지 못했습니다.');
    }

    sortSoundBuffer = await audioCtx.decodeAudioData(await response.arrayBuffer());
}

function playSortSound({ duration, n, indexes }) {
    if (!soundEnabled || !audioCtx || !sortSoundBuffer || indexes.length === 0) return;

    // 프레임마다 지나치게 많은 소리가 겹치지 않도록 오래된 소스를 정리한다.
    while (currentAudioSources.length >= 6) {
        const oldestSource = currentAudioSources.shift();
        try {
            oldestSource.stop();
        } catch (_) {
            // 이미 종료된 소스는 무시한다.
        }
    }

    const grainDuration = Math.min(
        Math.max(duration / 1000, 0.12),
        sortSoundBuffer.duration
    );

    // 한 프레임에서 최대 두 위치만 재생한다. 인덱스에 따라 웃음소리의
    // 재생 위치와 속도가 달라져 기존 음높이 기반 피드백을 대신한다.
    indexes.slice(0, 2).forEach((i) => {
        const normalizedIndex = i / Math.max(n - 1, 1);
        const source = audioCtx.createBufferSource();
        const gainNode = audioCtx.createGain();
        const maxOffset = Math.max(sortSoundBuffer.duration - grainDuration, 0);

        source.buffer = sortSoundBuffer;
        source.playbackRate.value = 0.8 + normalizedIndex * 0.7;
        gainNode.gain.value = 0.1;

        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        source.start(0, normalizedIndex * maxOffset, grainDuration);
        currentAudioSources.push(source);

        source.onended = () => {
            currentAudioSources = currentAudioSources.filter(item => item !== source);
        };
    });
}

async function playCompletionSound() {
    if (!soundEnabled || !audioCtx || !sortSoundBuffer) return;

    if (audioCtx.state !== 'running') {
        audioCtx.resume().catch(() => {});
    }

    // 자동재생이 차단된 상태에서는 시각화가 멈추지 않도록 다음 단계로 진행한다.
    if (audioCtx.state !== 'running') return;

    currentAudioSources.forEach(source => {
        try {
            source.stop();
        } catch (_) {
            // 이미 종료된 소스는 무시한다.
        }
    });
    currentAudioSources = [];

    await new Promise(resolve => {
        const source = audioCtx.createBufferSource();
        const gainNode = audioCtx.createGain();

        source.buffer = sortSoundBuffer;
        source.playbackRate.value = 1;
        gainNode.gain.value = 0.25;

        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        currentAudioSources.push(source);
        source.onended = () => {
            currentAudioSources = currentAudioSources.filter(item => item !== source);
            resolve();
        };
        source.start();
    });
}

function stopSortSounds() {
    currentAudioSources.forEach(source => {
        try {
            source.stop();
        } catch (_) {
            // 이미 종료된 소스는 무시한다.
        }
    });
    currentAudioSources = [];
}

function updateSoundToggle() {
    const button = document.getElementById('sound-toggle');
    button.setAttribute('aria-pressed', String(soundEnabled));
    button.innerText = soundEnabled ? '🔊' : '🔇';
}

async function toggleSortSound() {
    soundEnabled = !soundEnabled;
    updateSoundToggle();

    if (!soundEnabled) {
        stopSortSounds();
        return;
    }

    try {
        await ensureSortSoundReady();
        resumeSortSound();
    } catch (error) {
        console.error(error);
        soundEnabled = false;
        updateSoundToggle();
    }
}

function resumeSortSound() {
    if (audioCtx?.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
}

document.getElementById('sound-toggle').addEventListener('click', toggleSortSound);
execute().catch(error => console.error(error));
