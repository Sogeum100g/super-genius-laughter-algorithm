
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

    await Promise.all([imageReady, prepareSortSound()]);

    const frameDuration = 30
    const slowInterval = 10
    const fastInterval = 5
    const slowN = 128
    const fastN = 64

    for(let [isEfficient, sortGen,sortGenName] of [
        [false, bubbleSort, "버블 정렬"],
        [false, selectionSort, "선택 정렬"],
        [false, insertionSort, "삽입 정렬"],
        [true, mergeSort, "병합 정렬"],
        [true, quickSort, "퀵 정렬"],
        [true, heapSort, "힙 정렬"],
        [true, lsdRadixSort, "LSD 기수 정렬"],
    ]){
        const n = isEfficient ? slowN : fastN;
        const interval = isEfficient ? slowInterval : fastInterval;
        //#canvas-label에 function 이름을 출력합니다.
        document.getElementById('canvas-label').innerText = `${sortGenName}(${sortGen.name})`;
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
        await playCompletionSound();

    }

    console.log('done');
}


function rearrangeImage({ order, image, ctx, width = ctx.canvas.width, height = ctx.canvas.height, colored = [] }) {
    const canvas = ctx.canvas;

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const segmentCount = order.length;
    const segmentWidth = Math.floor(canvas.width / segmentCount);
    const remainder = canvas.width % segmentCount;

    let segments = [];

    let accumulatedWidth = 0;
    for (let i = 0; i < segmentCount; i++) {
        const currentSegmentWidth = i < remainder ? segmentWidth + 1 : segmentWidth;

        const segmentCanvas = document.createElement('canvas');
        segmentCanvas.width = currentSegmentWidth;
        segmentCanvas.height = canvas.height;
        const segmentCtx = segmentCanvas.getContext('2d');

        segmentCtx.drawImage(
            canvas,
            accumulatedWidth, 0, currentSegmentWidth, canvas.height, 
            0, 0, currentSegmentWidth, canvas.height 
        );

        segments.push(segmentCanvas);
        accumulatedWidth += currentSegmentWidth;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    accumulatedWidth = 0;
    for (let i = 0; i < segmentCount; i++) {
        const currentSegmentWidth = i < remainder ? segmentWidth + 1 : segmentWidth;
        const segmentIndex = order[i];
        const segment = segments[segmentIndex];
        ctx.drawImage(segment, accumulatedWidth, 0);
        accumulatedWidth += currentSegmentWidth;
    }

    for (const { indexes, color } of colored) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = color; 
        indexes.forEach(index => {
            const currentSegmentWidth = index < remainder ? segmentWidth + 1 : segmentWidth;
            const segmentXPosition = index * segmentWidth;
            ctx.fillRect(segmentXPosition, 0, currentSegmentWidth, canvas.height);
        });
        ctx.globalCompositeOperation = 'source-over';
    }
}


async function animateSort({ image, ctx, arr, interval, frameDuration, generator, yieldCompare, playStepSound = true }) {
    let finalArray = [...arr]; 
    let colorAndSoundQueue = [];
    const numStepsPerFrame = Math.ceil(frameDuration / interval);
    let i = 0;
    
    for (let result of generator(finalArray, yieldCompare)) {
        i++;
        if (i > 80000) break;
        const { array, swappedIndexes = [], compareIndexes = [], comparisons, swaps } = result;
        
        colorAndSoundQueue.push({
            array,
            colored: [
                { indexes: compareIndexes, color: 'rgba(255, 0, 0, 0.5)' },
                { indexes: swappedIndexes, color: 'rgba(0, 255, 0, 0.5)' },
            ],
            soundIndexes: compareIndexes.length === 0 ? swappedIndexes : compareIndexes
        });
        
        finalArray = array;
    }
    
    while (colorAndSoundQueue.length > 0) {
        let combinedArray;
        let combinedColored = [];
        let combinedSoundIndexes = new Set();

        for (let i = 0; i < numStepsPerFrame && colorAndSoundQueue.length > 0; i++) {
            let { array, colored, soundIndexes } = colorAndSoundQueue.shift();
            combinedArray = array;
            combinedColored.push(...colored);
            if(i === 0){
                soundIndexes.forEach(index => combinedSoundIndexes.add(index));
            }
        }
        
        rearrangeImage({ order: combinedArray, image, ctx, colored: combinedColored });
        if (playStepSound) {
            playSortSound({ duration: Math.max(frameDuration, interval), n: arr.length, indexes: Array.from(combinedSoundIndexes) });
        }
        await asleep(Math.max(frameDuration, interval));
    }
    
    rearrangeImage({ order: finalArray, image, ctx });
    return finalArray;
}


function asleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


let currentAudioSources = [];
let audioCtx;
let sortSoundBuffer;

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
    if (!audioCtx || !sortSoundBuffer || indexes.length === 0) return;

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
    if (!audioCtx || !sortSoundBuffer) return;

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
        source.onended = resolve;
        source.start();
    });
}

function resumeSortSound() {
    if (audioCtx?.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
}

window.addEventListener('pointerdown', resumeSortSound, { once: true });
window.addEventListener('keydown', resumeSortSound, { once: true });
window.addEventListener('load', () => {
    execute().catch(error => console.error(error));
}, { once: true });
