function* shuffleGenerator(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
        yield { array: [...arr], compareIndexes: [i, j] };
    }
}

function* accentGenerator(arr) {
    //compareIndexes 0~n까지 반환
    for (let i = 0; i < arr.length; i++) {
        yield { array: [...arr], swappedIndexes: [i] };
    }
    yield { array: [...arr] };
}

/**
 * 선택 정렬(Selection Sort)
 * 단순하지만 비효율적인 비교 기반 정렬 알고리즘이다. 
 * 이 알고리즘은 배열을 순차적으로 정렬하면서 
 * 각 단계에서 가장 작은 (또는 가장 큰) 요소를 선택하여 
 * 해당 요소를 현재 정렬된 부분의 다음 위치로 이동시키는 방식으로 동작한다.
 * == 선택 정렬의 작동 방식== 
 * 1. 주어진 배열에서 가장 작은 요소를 찾는다.
 * 2. 가장 작은 요소를 배열의 첫 번째 요소와 교환한다.
 * 3. 첫 번째 요소를 제외한 나머지 배열에서 다시 가장 작은 요소를 찾는다.
 * 4. 해당 요소를 배열의 두 번째 요소와 교환한다.
 * 5. 이 과정을 배열의 끝까지 반복한다.
 */
function* selectionSort(arr, yieldCompare = true) {
    let n = arr.length;
    let comparisons = 0;
    let swaps = 0;
    let previousSwappedIndexes = [];

    for (let i = 0; i < n - 1; i++) {
        let minIndex = i;
        for (let j = i + 1; j < n; j++) {
            comparisons++;
            if (yieldCompare) {
                yield {
                    array: [...arr],
                    swappedIndexes: previousSwappedIndexes,
                    compareIndexes: [i, j],
                    comparisons,
                    swaps
                };
            }

            if (arr[j] < arr[minIndex]) {
                minIndex = j;
            }
        }
        if (minIndex !== i) {
            [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
            swaps++;
            previousSwappedIndexes = [i, minIndex];

            yield {
                array: [...arr],
                swappedIndexes: previousSwappedIndexes,
                comparisons,
                swaps
            };
        }
    }


    yield {
        array: [...arr],
        comparisons,
        swaps
    };
}

/**
 * 삽입 정렬(Insertion Sort)
 * 또 다른 간단한 정렬 알고리즘으로, 
 * 부분적으로 정렬된 배열과 정렬되지 않은 배열의 두 부분으로 나누어 처리한다. 
 * 정렬되지 않은 부분에서 요소를 하나씩 가져와 
 * 이미 정렬된 부분의 올바른 위치에 삽입하는 방식으로 동작한다.
 * == 삽입 정렬의 작동 방식 == 
 * 1. 두 번째 요소부터 시작하여 이전 요소들과 비교한다.
 * 2. 현재 요소보다 큰 요소가 있다면, 해당 요소들을 오른쪽으로 한 칸씩 이동시킨다.
 * 3. 현재 요소보다 작거나 같은 요소를 만나거나 배열의 시작 부분에 도달할 때까지 이동한다.
 * 4. 현재 요소를 비교 대상 요소의 바로 앞에 삽입한다.
 * 5. 모든 요소에 대해 1~4 단계를 반복한다.
 */
function* insertionSort(arr, yieldCompare = true) {
    let n = arr.length;
    let comparisons = 0;
    let swaps = 0;
    let previousSwappedIndexes = [];

    for (let i = 1; i < n; i++) {
        let key = arr[i];
        let j = i - 1;

        while (j >= 0 && arr[j] > key) {
            comparisons++;
            if (yieldCompare) {
                yield {
                    array: [...arr],
                    swappedIndexes: previousSwappedIndexes,
                    compareIndexes: [j, j + 1],
                    comparisons,
                    swaps
                };
            }
            arr[j + 1] = arr[j];
            j = j - 1;
            swaps++;
            previousSwappedIndexes = [j + 1, j + 2];
        }
        arr[j + 1] = key;

        yield {
            array: [...arr],
            swappedIndexes: previousSwappedIndexes,
            comparisons,
            swaps
        };
    }

    yield {
        array: [...arr],
        comparisons,
        swaps
    };
}

/**
 * 병합 정렬(Merge Sort)
 * 분할 정복 알고리즘의 일종으로, 배열을 반으로 나누고, 각각을 정렬한 다음, 
 * 정렬된 두 배열을 병합하여 전체를 정렬하는 방식으로 동작한다.
 * 
 * == 병합 정렬의 작동 방식 ==
 * 1. 배열을 절반으로 나눈다.
 * 2. 나눈 배열을 재귀적으로 다시 병합 정렬을 적용한다.
 * 3. 정렬된 두 배열을 병합하여 하나의 배열로 만든다.
 * 4. 배열이 더 이상 나눌 수 없을 때까지 1~3 단계를 반복한다.
 */

const mergeSort = (function () {
    // 내부 함수로 merge를 정의하여 외부에 노출되지 않게 한다.
    function* merge(arr, left, mid, right, yieldCompare, stats) {
        const merged = [];
        let i = left, j = mid + 1;

        const initialArray = [...arr];

        while (i <= mid && j <= right) {
            stats.comparisons++;
            if (yieldCompare) {
                yield {
                    array: [...arr],
                    swappedIndexes: [],
                    compareIndexes: [i, j],
                    comparisons: stats.comparisons,
                    swaps: stats.swaps,
                };
            }
            if (arr[i] <= arr[j]) {
                merged.push(arr[i++]);
            } else {
                merged.push(arr[j++]);
            }
        }

        while (i <= mid) merged.push(arr[i++]);
        while (j <= right) merged.push(arr[j++]);

        // 병합한 결과를 원래 배열에 반영
        for (let k = left; k <= right; k++) {
            arr[k] = merged[k - left];
        }

        // 원래 배열과 병합된 배열 간의 차이를 바탕으로 swappedIndexes를 추출
        const swappedIndexes = [];
        for (let k = left; k <= right; k++) {
            if (arr[k] !== initialArray[k]) {
                swappedIndexes.push(k);
            }
        }

        if (yieldCompare && swappedIndexes.length > 0) {
            stats.swaps += swappedIndexes.length;
            yield {
                array: [...arr],
                swappedIndexes,
                compareIndexes: [],
                comparisons: stats.comparisons,
                swaps: stats.swaps,
            };
        }
    }

    // 병합 정렬의 재귀 함수
    function* mergeSortRecursive(arr, left, right, yieldCompare, stats) {
        if (left < right) {
            const mid = Math.floor((left + right) / 2);
            yield* mergeSortRecursive(arr, left, mid, yieldCompare, stats);
            yield* mergeSortRecursive(arr, mid + 1, right, yieldCompare, stats);
            yield* merge(arr, left, mid, right, yieldCompare, stats);
        }

    }

    // 병합 정렬을 수행하는 메인 함수
    return function* mergeSort(arr, yieldCompare = true) {
        const stats = { comparisons: 0, swaps: 0 };
        yield* mergeSortRecursive(arr, 0, arr.length - 1, yieldCompare, stats);
        return arr;
    };
})();

/**
 * 퀵 정렬(Quick Sort)
 * 분할 정복 알고리즘의 일종으로, 피벗을 선택하고 배열을 재배치하여
 * 피벗보다 작은 요소는 왼쪽에, 큰 요소는 오른쪽에 위치시킨다.
 * 그런 다음, 피벗을 기준으로 좌우 부분 배열에 대해 재귀적으로 동일한 작업을 반복한다.
 * 
 * == 퀵 정렬의 작동 방식 ==
 * 1. 배열에서 피벗을 선택한다.
 * 2. 피벗을 기준으로 배열을 두 부분으로 나눈다.
 * 3. 피벗보다 작은 요소는 왼쪽에, 큰 요소는 오른쪽에 위치시킨다.
 * 4. 피벗을 제외한 두 부분 배열에 대해 재귀적으로 퀵 정렬을 적용한다.
 */

const quickSort = (function () {
    // 배열을 분할하고 피벗의 최종 위치를 반환하는 함수
    function* partition(arr, low, high, yieldCompare, stats) {
        const pivot = arr[high];  // 피벗 선택
        let i = low - 1;  // 작은 요소의 마지막 인덱스

        for (let j = low; j < high; j++) {
            stats.comparisons++;
            if (yieldCompare) {
                yield {
                    array: [...arr],
                    swappedIndexes: [],
                    compareIndexes: [j, high],
                    comparisons: stats.comparisons,
                    swaps: stats.swaps,
                };
            }

            if (arr[j] <= pivot) {
                i++;
                [arr[i], arr[j]] = [arr[j], arr[i]];  // 요소 교환
                stats.swaps++;
                if (yieldCompare) {
                    yield {
                        array: [...arr],
                        swappedIndexes: [i, j],
                        compareIndexes: [],
                        comparisons: stats.comparisons,
                        swaps: stats.swaps,
                    };
                }
            }
        }

        // 피벗을 올바른 위치로 이동
        [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
        stats.swaps++;
        if (yieldCompare) {
            yield {
                array: [...arr],
                swappedIndexes: [i + 1, high],
                compareIndexes: [],
                comparisons: stats.comparisons,
                swaps: stats.swaps,
            };
        }

        return i + 1;  // 피벗의 최종 위치 반환
    }

    // 퀵 정렬의 재귀 함수
    function* quickSortRecursive(arr, low, high, yieldCompare, stats) {
        if (low < high) {
            const pi = yield* partition(arr, low, high, yieldCompare, stats);  // 분할 수행 및 피벗 위치 반환
            yield* quickSortRecursive(arr, low, pi - 1, yieldCompare, stats);  // 왼쪽 부분 배열 정렬
            yield* quickSortRecursive(arr, pi + 1, high, yieldCompare, stats); // 오른쪽 부분 배열 정렬
        }

        if (yieldCompare) {
            yield {
                array: [...arr],
                swappedIndexes: [],
                compareIndexes: [],
                comparisons: stats.comparisons,
                swaps: stats.swaps,
            };
        }
    }

    // 퀵 정렬을 수행하는 메인 함수
    return function* quickSort(arr, yieldCompare = true) {
        const stats = { comparisons: 0, swaps: 0 };
        yield* quickSortRecursive(arr, 0, arr.length - 1, yieldCompare, stats);
        return arr;
    };
})();

/**
 * 버블 정렬(Bubble Sort)
 * 인접한 두 요소를 비교하여 작은 값을 앞으로 이동시키는 방식으로 동작하는 정렬 알고리즘이다.
 * 배열이 정렬될 때까지 반복하며, 가장 큰 값이 점차 뒤로 이동한다.
 * 
 * == 버블 정렬의 작동 방식 ==
 * 1. 배열의 첫 번째 요소부터 시작하여 인접한 요소와 비교한다.
 * 2. 두 요소를 비교하여, 앞의 요소가 뒤의 요소보다 크면 위치를 교환한다.
 * 3. 배열 끝까지 비교를 반복하고, 그 과정에서 가장 큰 요소가 배열의 끝으로 이동한다.
 * 4. 배열이 정렬될 때까지 1~3 단계를 반복한다.
 */

function* bubbleSort(arr, yieldCompare = true) {
    const n = arr.length;
    let stats = { comparisons: 0, swaps: 0 };

    for (let i = 0; i < n - 1; i++) {
        let swapped = false;

        for (let j = 0; j < n - 1 - i; j++) {
            stats.comparisons++;
            if (yieldCompare) {
                yield {
                    array: [...arr],
                    swappedIndexes: [],
                    compareIndexes: [j, j + 1],
                    comparisons: stats.comparisons,
                    swaps: stats.swaps,
                };
            }

            // 인접 요소 비교 후 교환
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                swapped = true;
                stats.swaps++;

                if (yieldCompare) {
                    yield {
                        array: [...arr],
                        swappedIndexes: [j, j + 1],
                        compareIndexes: [],
                        comparisons: stats.comparisons,
                        swaps: stats.swaps,
                    };
                }
            }
        }

        // 교환이 한 번도 이루어지지 않으면 정렬이 완료된 것으로 간주하고 종료
        if (!swapped) break;
    }

    if (yieldCompare) {
        yield {
            array: [...arr],
            swappedIndexes: [],
            compareIndexes: [],
            comparisons: stats.comparisons,
            swaps: stats.swaps,
        };
    }

    return arr;
}
/**
 * 힙 정렬(Heap Sort)
 * 이진 힙(Binary Heap)을 이용한 정렬 알고리즘으로, 최대 힙을 구성하여 가장 큰 값을 배열의 끝으로 보내고,
 * 남은 부분을 다시 힙으로 구성해 정렬한다. O(n log n)의 시간 복잡도를 가지며, 안정 정렬은 아니다.
 * 
 * == 힙 정렬의 작동 방식 ==
 * 1. 주어진 배열을 최대 힙으로 구성한다.
 * 2. 힙의 루트(최대값)를 배열의 끝으로 이동시킨다.
 * 3. 힙 크기를 줄이고, 남은 부분을 다시 최대 힙으로 재구성한다.
 * 4. 2~3 단계를 반복하여 배열이 정렬될 때까지 수행한다.
 */

function* heapSort(arr, yieldCompare = true) {
    let n = arr.length;
    let stats = { comparisons: 0, swaps: 0 };

    // 최대 힙을 구성하는 함수
    function* heapify(arr, n, i) {
        let largest = i; // 루트
        let left = 2 * i + 1; // 왼쪽 자식
        let right = 2 * i + 2; // 오른쪽 자식

        // 왼쪽 자식이 루트보다 크다면
        if (left < n && arr[left] > arr[largest]) {
            largest = left;
        }

        // 오른쪽 자식이 현재 가장 큰 값보다 크다면
        if (right < n && arr[right] > arr[largest]) {
            largest = right;
        }

        // 가장 큰 값이 루트가 아니라면
        if (largest !== i) {
            stats.comparisons++;
            if (yieldCompare) {
                yield {
                    array: [...arr],
                    swappedIndexes: [],
                    compareIndexes: [i, largest],
                    comparisons: stats.comparisons,
                    swaps: stats.swaps,
                };
            }

            [arr[i], arr[largest]] = [arr[largest], arr[i]];
            stats.swaps++;

            if (yieldCompare) {
                yield {
                    array: [...arr],
                    swappedIndexes: [i, largest],
                    compareIndexes: [],
                    comparisons: stats.comparisons,
                    swaps: stats.swaps,
                };
            }

            // 재귀적으로 힙을 재구성
            yield* heapify(arr, n, largest);
        }
    }

    // 초기 배열을 최대 힙으로 변환
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
        yield* heapify(arr, n, i);
    }

    // 하나씩 요소를 힙에서 추출하여 정렬
    for (let i = n - 1; i > 0; i--) {
        [arr[0], arr[i]] = [arr[i], arr[0]];
        stats.swaps++;

        if (yieldCompare) {
            yield {
                array: [...arr],
                swappedIndexes: [0, i],
                compareIndexes: [],
                comparisons: stats.comparisons,
                swaps: stats.swaps,
            };
        }

        yield* heapify(arr, i, 0);
    }

    if (yieldCompare) {
        yield {
            array: [...arr],
            swappedIndexes: [],
            compareIndexes: [],
            comparisons: stats.comparisons,
            swaps: stats.swaps,
        };
    }

    return arr;
}

/**
 * LSD 기수 정렬(LSD Radix Sort)
 * 
 * LSD 기수 정렬은 비교 기반이 아닌 정렬 알고리즘으로, 정수 또는 문자열을
 * 자리수(또는 문자)의 최하위부터 시작하여 정렬한다. 이 알고리즘은 안정적이며
 * O(nk)의 시간 복잡도를 가지며, 여기서 n은 숫자의 개수, k는 숫자의 최대 자릿수이다.
 * 
 * == LSD 기수 정렬의 작동 방식 ==
 * 1. 배열의 각 숫자를 자릿수별로 분류한다.
 * 2. 각 자릿수마다 안정적인 계수 정렬(Counting Sort)을 사용해 정렬한다.
 * 3. 자릿수 순서대로 정렬된 배열을 얻을 때까지 반복한다.
 */
function* lsdRadixSort(arr, yieldCompare = true) {
    // 최대 자릿수를 찾기 위해 배열의 최대값을 확인한다.
    const maxNum = Math.max(...arr);
    // 최대 자릿수를 기반으로 반복 횟수를 결정한다.
    let exp = 1;
    let stats = { comparisons: 0, swaps: 0 };

    // 자릿수를 기반으로 반복하여 정렬한다.
    while (Math.floor(maxNum / exp) > 0) {
        // 계수 정렬을 위한 버킷을 초기화한다 (0~9).
        let output = new Array(arr.length).fill(0);
        let count = new Array(10).fill(0);

        // 각 자릿수에 따라 요소를 분류한다.
        for (let i = 0; i < arr.length; i++) {
            let digit = Math.floor(arr[i] / exp) % 10;
            yield {
                array: [...arr],
                swappedIndexes: [],
                compareIndexes: [i],
                comparisons: stats.comparisons,
                swaps: stats.swaps,
            };
            count[digit]++;
        }

        // 누적 카운트를 계산하여 위치를 결정한다.
        for (let i = 1; i < 10; i++) {
            count[i] += count[i - 1];
            yield {
                array: [...arr],
                swappedIndexes: [],
                compareIndexes: [],
                comparisons: stats.comparisons,
                swaps: stats.swaps,
            };
        }

        // 배열의 요소들을 자릿수에 따라 정렬된 위치에 배치한다.
        for (let i = arr.length - 1; i >= 0; i--) {
            let digit = Math.floor(arr[i] / exp) % 10;
            output[--count[digit]] = arr[i];
            yield {
                array: [...arr],
                swappedIndexes: [],
                compareIndexes: [i],
                comparisons: stats.comparisons,
                swaps: stats.swaps,
            };
        }

        // 정렬된 결과를 원래 배열에 복사한다.
        for (let i = 0; i < arr.length; i++) {
            arr[i] = output[i];
            stats.swaps++;

            // 배열의 상태를 외부로 전달하기 위해 yield한다.
            if (yieldCompare) {
                yield {
                    array: [...arr],
                    swappedIndexes: [i],
                    compareIndexes: [],
                    comparisons: stats.comparisons,
                    swaps: stats.swaps,
                };
            }
        }

        // 다음 자릿수로 이동한다.
        exp *= 10;
    }

    // 최종적으로 정렬된 배열을 반환한다.
    if (yieldCompare) {
        yield {
            array: [...arr],
            comparisons: stats.comparisons,
            swaps: stats.swaps,
        };
    }

    return arr;
}
