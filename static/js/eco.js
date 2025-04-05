// Константы для валидации
const MIN_WIDTH = 300;  // мм
const MAX_WIDTH = 6000; // мм
const MIN_HEIGHT = 100; // мм
const MAX_HEIGHT = 3400; // мм

// Константы для цветов
const COLOR_MAPPING = {
    'RAL9005': { frame: 0x000000, dpk: 0x382B22 }, // Черный - Венге
    'RAL8017': { frame: 0x44322D, dpk: 0x8B4513 }, // Коричневый - Коричневый
    'RAL7024': { frame: 0x474A51, dpk: 0x808080 }  // Серый - Серый
};

// Функция валидации формы
function validateForm() {
    const width = parseFloat(document.getElementById('width').value);
    const height = parseFloat(document.getElementById('height').value);
    
    if (width < MIN_WIDTH || width > MAX_WIDTH) {
        alert(`Ширина должна быть от ${MIN_WIDTH} до ${MAX_WIDTH} мм`);
        return false;
    }
    
    if (height < MIN_HEIGHT || height > MAX_HEIGHT) {
        alert(`Высота должна быть от ${MIN_HEIGHT} до ${MAX_HEIGHT} мм`);
        return false;
    }
    
    return true;
}

// Глобальные переменные
let scene, camera, renderer, controls;
let stairModel = new THREE.Group();
let coveringsGroup = new THREE.Group();
let boltsGroup = new THREE.Group();
const profile_thickness = 20; // Выносим в глобальную область

// Обработчики для мобильных панелей
document.addEventListener('DOMContentLoaded', function() {
    const leftPanel = document.querySelector('.left-panel');
    const rightPanel = document.querySelector('.right-panel');
    const toggleLeft = document.querySelector('.toggle-left');
    const toggleRight = document.querySelector('.toggle-right');

    toggleLeft?.addEventListener('click', () => {
        leftPanel.classList.toggle('active');
        toggleLeft.textContent = leftPanel.classList.contains('active') ? '‹' : '›';
    });

    toggleRight?.addEventListener('click', () => {
        rightPanel.classList.toggle('active');
        toggleRight.textContent = rightPanel.classList.contains('active') ? '›' : '‹';
    });

    // Закрываем панели при клике на canvas в мобильной версии
    document.getElementById('canvas-container').addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            leftPanel.classList.remove('active');
            rightPanel.classList.remove('active');
            toggleLeft.textContent = '›';
            toggleRight.textContent = '‹';
        }
    });

    // Обработчики для кнопок быстрого выбора и материалов
    document.querySelectorAll('.quick-select button').forEach(button => {
        button.addEventListener('click', function() {
            const value = this.getAttribute('data-value');
            const input = this.closest('.mb-3').querySelector('input[type="number"]');
            input.value = value;
            // Вызываем событие input для активации валидации
            input.dispatchEvent(new Event('input'));
        });
    });

    // Обработчики для кнопок выбора материала
    const materialButtons = document.querySelectorAll('.material-btn');
    const materialInput = document.getElementById('material');

    // Устанавливаем ДПК как материал по умолчанию
    const defaultMaterialBtn = document.querySelector('.material-btn[data-value="ДПК"]');
    if (defaultMaterialBtn) {
        defaultMaterialBtn.classList.add('active');
        materialInput.value = 'ДПК';
    }

    materialButtons.forEach(button => {
        button.addEventListener('click', function() {
            materialButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const materialValue = this.getAttribute('data-value');
            materialInput.value = materialValue;
            
            // Устанавливаем значение подъема доски в зависимости от материала
            const boardElevationInput = document.getElementById('board-elevation');
            if (materialValue === 'ДПК') {
                boardElevationInput.value = '10';  // 10мм для ДПК
            } else if (materialValue === 'ДПК+1 ПВЛ') {
                boardElevationInput.value = '10';  // 10мм для ДПК+1 ПВЛ (кроме первой ступени)
            } else {
                boardElevationInput.value = '0';   // 0мм для ПВЛ
            }
            
            // Вызываем событие change для активации валидации
            materialInput.dispatchEvent(new Event('change'));
        });
    });

    // Обработчики для цветов каркаса
    document.querySelectorAll('input[name="frame-color"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('frame-color').value = this.value;
            updateMaterialColors();
        });
    });
});

// Функция обновления цветов материалов
function updateMaterialColors() {
    const frameColor = document.getElementById('frame-color').value;
    const colors = COLOR_MAPPING[frameColor];
    
    // Обновляем цвет каркаса
    stairModel.traverse((child) => {
        if (child.isMesh && child.material && !child.userData.isDPK && !child.userData.isBolt) {
            child.material.color.setHex(colors.frame);
        }
    });

    // Обновляем цвет ДПК
    coveringsGroup.traverse((child) => {
        if (child.isMesh && child.material && child.userData.isDPK) {
            child.material.color.setHex(colors.dpk);
        }
    });

    // Если материал ПВЛ, красим его в цвет каркаса
    const material = document.getElementById('material').value;
    if (material === 'ПВЛ' || material === 'ДПК+1 ПВЛ') {
        coveringsGroup.traverse((child) => {
            if (child.isMesh && child.material && child.userData.isPVL) {
                child.material.color.setHex(colors.frame);
            }
        });
    }
}

// Инициализация Three.js
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const container = document.getElementById('canvas-container');
    const aspect = container.clientWidth / container.clientHeight;
    
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
    camera.position.set(2000, 1000, 2000);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 100;
    controls.maxDistance = 5000;
    controls.maxPolarAngle = Math.PI / 1.5;

    // Добавляем освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1000, 1000, 1000);
    scene.add(directionalLight);

    // Добавляем оси координат для отладки
    // const axesHelper = new THREE.AxesHelper(1000);
    // scene.add(axesHelper);

    scene.add(stairModel);
    scene.add(coveringsGroup);
    scene.add(boltsGroup);
}

// Обновляем функцию изменения размера
function onWindowResize() {
    const container = document.getElementById('canvas-container');
    const aspect = container.clientWidth / container.clientHeight;
    
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Материалы
const dpkMaterial = new THREE.MeshPhongMaterial({
    color: 0x8B4513,
    flatShading: true,
    shininess: 30
});

const pvlMaterial = new THREE.MeshPhongMaterial({
    color: 0xA0A0A0,
    wireframe: true,
    wireframeLinewidth: 1,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
});

const boltMaterial = new THREE.MeshPhongMaterial({
    color: 0xC0C0C0,  // Серебристый цвет
    shininess: 100,    // Высокий блеск
    specular: 0xFFFFFF // Белые блики
});

function createBolt() {
    const boltGroup = new THREE.Group();
    
    // Шляпка болта (более плоская)
    const headGeometry = new THREE.CylinderGeometry(4, 4, 2, 16); // Увеличили количество сегментов для гладкости
    const head = new THREE.Mesh(headGeometry, boltMaterial);
    boltGroup.add(head);
    
    // Тело болта
    const bodyGeometry = new THREE.CylinderGeometry(2, 2, 30, 16);
    const body = new THREE.Mesh(bodyGeometry, boltMaterial);
    body.position.y = -15;
    boltGroup.add(body);
    
    return boltGroup;
}

function createDPKBoards(width, depth, stepHeight, stepZ, boardElevation = 0) {
    const frameColor = document.getElementById('frame-color').value;
    const colors = COLOR_MAPPING[frameColor];
    
    const dpkMaterial = new THREE.MeshPhongMaterial({
        color: colors.dpk,
        flatShading: true
    });

    const boardGroup = new THREE.Group();
    const boardWidth = 150; // Стандартная ширина доски
    const boardHeight = 25;
    const gap = 5; // Зазор между досками
    const frontOffset = 10; // Смещение досок вперед на 10мм

    // Вычисляем количество полных досок и остаток
    const numFullBoards = Math.floor((depth + gap) / (boardWidth + gap));
    const remainingSpace = depth - (numFullBoards * boardWidth + (numFullBoards - 1) * gap);

    // Размещаем полные доски
    for (let i = 0; i < numFullBoards; i++) {
        const boardGeometry = new THREE.BoxGeometry(width, boardHeight, boardWidth);
        const board = new THREE.Mesh(boardGeometry, dpkMaterial);
        const zPosition = i * (boardWidth + gap) + boardWidth/2 - frontOffset;
        // Добавляем смещение по высоте
        board.position.set(0, boardHeight/2 + boardElevation, zPosition);
        boardGroup.add(board);

        // Добавляем болты для каждой доски
        const boltPositions = [
            {x: -width/2 + 10, z: zPosition}, // Левый
            {x: width/2 - 10, z: zPosition}   // Правый
        ];

        boltPositions.forEach(pos => {
            const bolt = createBolt();
            // Поднимаем болты вместе с доской
            bolt.position.set(pos.x, stepHeight + boardHeight + boardElevation + 1, pos.z + stepZ);
            boltsGroup.add(bolt);
        });
    }

    // Если остался промежуток, добавляем последнюю доску нестандартной ширины
    if (remainingSpace > 0) {
        const lastBoardGeometry = new THREE.BoxGeometry(width, boardHeight, remainingSpace);
        const lastBoard = new THREE.Mesh(lastBoardGeometry, dpkMaterial);
        const zPosition = numFullBoards * (boardWidth + gap) + remainingSpace/2 - frontOffset;
        // Добавляем смещение по высоте для последней доски
        lastBoard.position.set(0, boardHeight/2 + boardElevation, zPosition);
        boardGroup.add(lastBoard);

        // Болты для последней доски
        const boltPositions = [
            {x: -width/2 + 10, z: zPosition}, // Левый
            {x: width/2 - 10, z: zPosition}   // Правый
        ];

        boltPositions.forEach(pos => {
            const bolt = createBolt();
            // Поднимаем болты вместе с последней доской
            bolt.position.set(pos.x, stepHeight + boardHeight + boardElevation + 1, pos.z + stepZ);
            boltsGroup.add(bolt);
        });
    }

    // Перемещаем всю группу досок на нужную позицию по Z
    boardGroup.position.z = stepZ;
    return boardGroup;
}

function createDPKPlatform(width, depth, stepHeight, stepZ, boardElevation = 0) {
    return createDPKBoards(width, depth, stepHeight, stepZ, boardElevation);
}

function createPVLCover(width, depth) {
    const frameColor = document.getElementById('frame-color').value;
    const colors = COLOR_MAPPING[frameColor];
    
    const pvlMaterial = new THREE.MeshPhongMaterial({
        color: colors.frame,
        flatShading: true
    });

    const pvlGroup = new THREE.Group();
    const gridSize = 30; // Размер ячейки сетки

    // Основная пластина внутри каркаса, учитываем толщину профиля с обеих сторон
    const pvlDepth = depth - (2 * profile_thickness);
    const plateGeometry = new THREE.BoxGeometry(width - (2 * profile_thickness), 2, pvlDepth);
    const plate = new THREE.Mesh(plateGeometry, pvlMaterial);
    // Смещаем пластину на толщину профиля от начала
    plate.position.set(0, 1, profile_thickness + pvlDepth/2);
    pvlGroup.add(plate);
    
    // Создаем вертикальные линии сетки
    const verticalLines = Math.floor((width - (2 * profile_thickness)) / gridSize);
    for (let i = 0; i <= verticalLines; i++) {
        const lineGeometry = new THREE.BoxGeometry(1, 3, pvlDepth);
        const line = new THREE.Mesh(lineGeometry, pvlMaterial);
        const xPos = -width/2 + profile_thickness + i * gridSize;
        line.position.set(xPos, 1, profile_thickness + pvlDepth/2);
        pvlGroup.add(line);
    }
    
    // Создаем горизонтальные линии сетки
    const horizontalLines = Math.floor(pvlDepth / gridSize);
    for (let i = 0; i <= horizontalLines; i++) {
        const lineGeometry = new THREE.BoxGeometry(width - (2 * profile_thickness), 3, 1);
        const line = new THREE.Mesh(lineGeometry, pvlMaterial);
        const zPos = profile_thickness + i * gridSize;
        line.position.set(0, 1, zPos);
        pvlGroup.add(line);
    }

    return pvlGroup;
}

function needsHorizontalReinforcement(stepIndex, material) {
    if (material === "ПВЛ") {
        return false;
    }
    if (material === "ДПК+1 ПВЛ" && stepIndex === 0) {
        return false;
    }
    if (material === "ДПК") {
        return true;
    }
    if (material === "ДПК+1 ПВЛ" && stepIndex > 0) {
        return true;
    }
    return false;
}

function needsDepthReinforcement(depth, material) {
    // Для ПВЛ нужно усиление если глубина больше 305мм
    return material === "ПВЛ" && depth > 305;
}

function updateVisibility() {
    const showCovering = document.getElementById('show-covering').checked;
    const showBolts = document.getElementById('show-bolts').checked;
    
    coveringsGroup.visible = showCovering;
    boltsGroup.visible = showBolts;
}

function createStairModel(dimensions) {
    const frameColor = document.getElementById('frame-color').value;
    const colors = COLOR_MAPPING[frameColor];
    
    // Очищаем группы перед созданием новой модели
    scene.remove(stairModel);
    stairModel = new THREE.Group();
    coveringsGroup = new THREE.Group();
    boltsGroup = new THREE.Group();

    const {width, height, step_height, step_depth, profile_thickness, has_platform, platform_depth, reinforcements_count, material, board_elevation, paint_consumption} = dimensions;
    const steps = Math.round(height / step_height);

    // Определяем необходимость горизонтальных усилений для каждой ступени
    function needsHorizontalReinforcement(stepIndex) {
        if (material === "ПВЛ") return false;
        if (material === "ДПК+1 ПВЛ" && stepIndex === 0) return false;
        if (material === "ДПК") return true;
        if (material === "ДПК+1 ПВЛ" && stepIndex > 0) return true;
        return false;
    }

    // Материал для профиля 20х20
    const frameMaterial = new THREE.MeshPhongMaterial({
        color: colors.frame,
        opacity: 1,
        transparent: false
    });

    // 1. Горизонтальное основание на земле
    // Продольные балки основания - от переднего края до заднего
    // Корректируем общую глубину с учетом возможной площадки
    const lastStepDepth = (has_platform && platform_depth > 0) ? platform_depth : step_depth;
    const totalDepth = step_depth * (steps - 1) + lastStepDepth - profile_thickness; // Уменьшаем на 20мм
    const baseLongBeamGeometry = new THREE.BoxGeometry(profile_thickness, profile_thickness, totalDepth);
    
    // Левая продольная балка основания
    const leftBaseLongBeam = new THREE.Mesh(baseLongBeamGeometry, frameMaterial);
    leftBaseLongBeam.position.set(-width/2 + profile_thickness/2, 0, totalDepth/2);
    stairModel.add(leftBaseLongBeam);
    
    // Правая продольная балка основания
    const rightBaseLongBeam = new THREE.Mesh(baseLongBeamGeometry, frameMaterial);
    rightBaseLongBeam.position.set(width/2 - profile_thickness/2, 0, totalDepth/2);
    stairModel.add(rightBaseLongBeam);
    
    // Поперечные балки основания - передняя и задняя
    const baseBeamGeometry = new THREE.BoxGeometry(width, profile_thickness, profile_thickness);
    
    // Передняя поперечина основания
    const frontBaseBeam = new THREE.Mesh(baseBeamGeometry, frameMaterial);
    frontBaseBeam.position.set(0, 0, 0);
    stairModel.add(frontBaseBeam);
    
    // Задняя поперечина основания (под задними стойками последней ступени)
    const backBaseBeam = new THREE.Mesh(baseBeamGeometry, frameMaterial);
    backBaseBeam.position.set(0, 0, totalDepth); // Теперь она будет на 20мм ближе к переду
    stairModel.add(backBaseBeam);

    // 2. Горизонтальные ступени и их опоры
    for (let i = 0; i < steps; i++) {
        // Проверяем, является ли это последней ступенью и есть ли площадка
        const isLastStep = i === steps - 1;
        const isPlatform = isLastStep && has_platform;
        const currentStepDepth = isPlatform ? platform_depth : step_depth;

        // Рама ступени (передняя и задняя балки)
        const stepFrameGeometry = new THREE.BoxGeometry(width, profile_thickness, profile_thickness);
        
        // Передняя балка ступени
        const frontStepBeam = new THREE.Mesh(stepFrameGeometry, frameMaterial);
        frontStepBeam.position.set(0, (i + 1) * step_height, i * step_depth);
        stairModel.add(frontStepBeam);
        
        // Задняя балка ступени
        const backStepBeam = new THREE.Mesh(stepFrameGeometry, frameMaterial);
        backStepBeam.position.set(0, (i + 1) * step_height, i * step_depth + currentStepDepth - profile_thickness);
        stairModel.add(backStepBeam);
        
        // Боковые балки ступени
        const sideSupportGeometry = new THREE.BoxGeometry(profile_thickness, profile_thickness, currentStepDepth - profile_thickness);
        
        // Левая боковая балка
        const leftSideSupport = new THREE.Mesh(sideSupportGeometry, frameMaterial);
        leftSideSupport.position.set(-width/2 + profile_thickness/2, (i + 1) * step_height, i * step_depth + (currentStepDepth - profile_thickness)/2);
        stairModel.add(leftSideSupport);
        
        // Правая боковая балка
        const rightSideSupport = new THREE.Mesh(sideSupportGeometry, frameMaterial);
        rightSideSupport.position.set(width/2 - profile_thickness/2, (i + 1) * step_height, i * step_depth + (currentStepDepth - profile_thickness)/2);
        stairModel.add(rightSideSupport);

        // 3. Вертикальные стойки от ступени до основания
        const leftStandGeometry = new THREE.BoxGeometry(profile_thickness, (i + 1) * step_height, profile_thickness);
        const rightStandGeometry = new THREE.BoxGeometry(profile_thickness, (i + 1) * step_height, profile_thickness);
        
        // Передние стойки (для всех ступеней)
        const frontLeftStand = new THREE.Mesh(leftStandGeometry, frameMaterial);
        frontLeftStand.position.set(-width/2 + profile_thickness/2, ((i + 1) * step_height)/2, i * step_depth);
        stairModel.add(frontLeftStand);
        
        const frontRightStand = new THREE.Mesh(rightStandGeometry, frameMaterial);
        frontRightStand.position.set(width/2 - profile_thickness/2, ((i + 1) * step_height)/2, i * step_depth);
        stairModel.add(frontRightStand);
        
        // Задние стойки (только для последней ступени)
        if (isLastStep) {
            const backLeftStand = new THREE.Mesh(leftStandGeometry, frameMaterial);
            backLeftStand.position.set(-width/2 + profile_thickness/2, ((i + 1) * step_height)/2, i * step_depth + currentStepDepth - profile_thickness);
            stairModel.add(backLeftStand);
            
            const backRightStand = new THREE.Mesh(rightStandGeometry, frameMaterial);
            backRightStand.position.set(width/2 - profile_thickness/2, ((i + 1) * step_height)/2, i * step_depth + currentStepDepth - profile_thickness);
            stairModel.add(backRightStand);
        }
    }

    // Функция для расчета количества усилений в зависимости от ширины
    function calculateReinforcementsCount(width) {
        if (width <= 1000) return 1;
        return Math.ceil((width - 1000) / 300) + 1;
    }

    // Добавляем усиления
    const reinforcementsCount = reinforcements_count || calculateReinforcementsCount(width);
    const spacing = (width - 2 * profile_thickness) / (reinforcements_count + 1);
    
    // Усиления для каждой ступени
    for (let i = 0; i < steps; i++) {
        const startY = i * step_height;
        const isLastStep = i === steps - 1;
        const currentStepDepth = isLastStep && has_platform ? platform_depth : step_depth;
        const currentStepZ = i * step_depth; // Позиция начала текущей ступени всегда основана на step_depth
        
        for (let j = 0; j < reinforcementsCount; j++) {
            const xPos = -width/2 + profile_thickness + spacing * (j + 1);
            
            if (i === 0) {
                // Для первой ступени - вертикальное усиление до основания
                const frontStandGeometry = new THREE.BoxGeometry(profile_thickness, step_height, profile_thickness);
                const frontStand = new THREE.Mesh(frontStandGeometry, frameMaterial);
                frontStand.position.set(xPos, step_height/2, 0);
                stairModel.add(frontStand);
            } else {
                // Для остальных ступеней - вертикальное усиление между ступенями
                const standGeometry = new THREE.BoxGeometry(profile_thickness, step_height, profile_thickness);
                const stand = new THREE.Mesh(standGeometry, frameMaterial);
                // Позиционируем у задней части предыдущей ступени
                const previousStepZ = (i - 1) * step_depth;
                stand.position.set(xPos, startY + step_height/2, previousStepZ + step_depth);
                stairModel.add(stand);
            }

            // Добавляем горизонтальные усиления для ступеней
            if (needsHorizontalReinforcement(i, material)) {
                const horizontalReinforcementGeometry = new THREE.BoxGeometry(profile_thickness, profile_thickness, currentStepDepth - profile_thickness);
                const horizontalReinforcement = new THREE.Mesh(horizontalReinforcementGeometry, frameMaterial);
                horizontalReinforcement.position.set(
                    xPos,
                    (i + 1) * step_height,
                    currentStepZ + (currentStepDepth - profile_thickness)/2
                );
                stairModel.add(horizontalReinforcement);
            }
        }
    }

    // Для последней ступени - дополнительное вертикальное усиление от задней части до основания
    if (steps > 1) {
        const lastStepZ = (steps - 1) * step_depth; // Позиция начала последней ступени
        
        for (let j = 0; j < reinforcementsCount; j++) {
            const xPos = -width/2 + profile_thickness + spacing * (j + 1);
            const standHeight = steps * step_height;
            
            const backStandGeometry = new THREE.BoxGeometry(profile_thickness, standHeight, profile_thickness);
            const backStand = new THREE.Mesh(backStandGeometry, frameMaterial);
            // Позиционируем у задней части последней ступени/площадки
            backStand.position.set(xPos, standHeight/2, lastStepZ + lastStepDepth - profile_thickness);
            stairModel.add(backStand);
        }
    }

    // Добавляем усиление глубины для ПВЛ если нужно
    function createDepthReinforcement(width, height, depth, x, y, z) {
        // Создаем усиление поперек ступени
        const reinforcementGeometry = new THREE.BoxGeometry(profile_thickness, height, depth);
        const reinforcement = new THREE.Mesh(reinforcementGeometry, frameMaterial);
        reinforcement.position.set(x, y, z);
        return reinforcement;
    }

    for (let i = 0; i < steps; i++) {
        const isLastStep = i === steps - 1;
        const currentStepDepth = isLastStep && has_platform ? platform_depth : step_depth;
        const stepPosition = {
            x: 0,
            y: (i + 1) * step_height,
            z: i * step_depth
        };

        // Добавляем усиление глубины для ПВЛ если нужно
        if (isLastStep && needsDepthReinforcement(currentStepDepth, material)) {
            console.log(`Добавляем усиление для площадки глубиной ${currentStepDepth}мм`);
            
            // Получаем количество стоек усиления из основных параметров
            const spacing = (width - 2 * profile_thickness) / (reinforcements_count + 1);
            
            // Добавляем усиления с тем же расстоянием, что и вертикальные стойки
            for (let j = 0; j < reinforcements_count; j++) {
                const xPos = -width/2 + profile_thickness + spacing * (j + 1);
                const reinforcement = createDepthReinforcement(
                    profile_thickness,
                    profile_thickness,
                    currentStepDepth - 2 * profile_thickness,
                    xPos,
                    stepPosition.y,
                    stepPosition.z + currentStepDepth/2
                );
                stairModel.add(reinforcement);
            }
        }

        if (material === "ДПК" || (material === "ДПК+1 ПВЛ" && i > 0)) {
            if (isLastStep && has_platform) {
                const platformBoards = createDPKPlatform(width, currentStepDepth, stepPosition.y, stepPosition.z, board_elevation);
                platformBoards.position.set(stepPosition.x, stepPosition.y, stepPosition.z);
                coveringsGroup.add(platformBoards);
            } else {
                const dpkBoards = createDPKBoards(width, currentStepDepth, stepPosition.y, stepPosition.z, board_elevation);
                dpkBoards.position.set(stepPosition.x, stepPosition.y, stepPosition.z);
                coveringsGroup.add(dpkBoards);
            }
        } else if (material === "ПВЛ" || (material === "ДПК+1 ПВЛ" && i === 0)) {
            const pvlCover = createPVLCover(width, currentStepDepth);
            pvlCover.position.set(stepPosition.x, stepPosition.y, stepPosition.z);
            coveringsGroup.add(pvlCover);
        }
    }

    stairModel.add(coveringsGroup);
    stairModel.add(boltsGroup);

    // Центрируем модель
    stairModel.position.set(0, 0, -step_depth * (steps-1) / 2);
    scene.add(stairModel);

    // Настраиваем камеру для лучшего обзора
    camera.position.set(width * 2, height * 1.5, width * 2);
    camera.lookAt(0, height/2, 0);
    controls.update();
}

// Обновляем функцию изменения результатов
function updateResults(result) {
    const resultDetails = document.getElementById('result-details');
    const resultBox = document.getElementById('result');
    
    if (result.error) {
        resultDetails.innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        resultBox.classList.remove('hidden');
        return;
    }

    let html = `
        <div class="mb-3">
            <h5>Параметры:</h5>
            <ul>
                <li>Материал: ${result.dimensions.material}</li>
                <li>Цвет каркаса: ${result.dimensions.frame_color}</li>`;
    
    if (result.dimensions.material === 'ДПК' || result.dimensions.material === 'ДПК+1 ПВЛ') {
        if (result.additional_materials.dpk_color) {
            html += `<li>Цвет доски ДПК: ${result.additional_materials.dpk_color}</li>`;
        }
    }
    
    html += `
                <li>Ширина: ${result.dimensions.width} мм</li>
                <li>Высота: ${result.dimensions.height} мм</li>
                <li>Количество ступеней: ${Math.round(result.dimensions.height / result.dimensions.step_height)}</li>
            </ul>
        </div>
        
        <div class="mb-3">
            <h5>Металлический каркас:</h5>
            <ul>
                <li>Общая длина профиля: ${result.total_length.mm} мм (${result.total_length.m} м)</li>
                <li>Площадь покраски: ${result.paint.total_area} м²</li>
                <li>Вес краски: ${result.paint.total_weight} г</li>
            </ul>
        </div>`;
    
    if (result.additional_materials) {
        html += `
        <div class="mb-3">
            <h5>Дополнительные материалы:</h5>
            <ul>`;
        
        if (result.additional_materials.dpk_length) {
            html += `<li>Общая длина досок ДПК: ${result.additional_materials.dpk_length} м</li>`;
        }
        if (result.additional_materials.dpk_boards) {
            html += `<li>Количество досок ДПК: ${result.additional_materials.dpk_boards} шт</li>`;
        }
        if (result.additional_materials.bolts_count) {
            html += `
                <li>Количество болтов: ${result.additional_materials.bolts_count} шт</li>
                <li>Количество гаек: ${result.additional_materials.nuts_count} шт</li>`;
        }
        
        html += `</ul></div>`;
    }
    
    resultDetails.innerHTML = html;
    resultBox.classList.remove('hidden');
}

// Обновляем функцию изменения 3D модели
function updateStairsModel(dimensions) {
    // Очищаем существующую модель
    while(stairModel.children.length > 0) {
        stairModel.remove(stairModel.children[0]);
    }
    while(coveringsGroup.children.length > 0) {
        coveringsGroup.remove(coveringsGroup.children[0]);
    }
    while(boltsGroup.children.length > 0) {
        boltsGroup.remove(boltsGroup.children[0]);
    }
    
    // Создаем новую модель
    createStairModel(dimensions);
}

// Обработчики событий
document.getElementById('calculator-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }

    const formData = {
        width: parseFloat(document.getElementById('width').value),
        height: parseFloat(document.getElementById('height').value),
        steps: parseInt(document.getElementById('steps').value),
        material: document.getElementById('material').value,
        has_platform: document.getElementById('has-platform').checked,
        platform_depth: document.getElementById('has-platform').checked ? parseFloat(document.getElementById('platform-depth').value) : 0,
        reinforcements_count: document.getElementById('custom-reinforcements').checked ? parseInt(document.getElementById('reinforcements-count').value) : 1,
        paint_consumption: parseFloat(document.getElementById('paint-consumption').value),
        frame_color: document.getElementById('frame-color').value
    };
    
    try {
        const response = await fetch('/api/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка сервера');
        }
        
        const result = await response.json();
        updateResults(result);
        updateStairsModel(result.dimensions);
        
    } catch (error) {
        if (!navigator.onLine) {
            alert('Отсутствует подключение к интернету');
        } else {
            alert(`Ошибка: ${error.message}`);
        }
    }
});

document.getElementById('has-platform').addEventListener('change', function(e) {
    const platformDepthContainer = document.getElementById('platform-depth-container');
    if (e.target.checked) {
        platformDepthContainer.classList.remove('hidden');
    } else {
        platformDepthContainer.classList.add('hidden');
    }
});

document.getElementById('custom-reinforcements').addEventListener('change', function(e) {
    const container = document.getElementById('reinforcements-count-container');
    if (e.target.checked) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
});

document.getElementById('show-covering').addEventListener('change', updateVisibility);
document.getElementById('show-bolts').addEventListener('change', updateVisibility);
document.getElementById('additional-bolts').addEventListener('change', function() {
    recalculateStairs();
});

// Инициализируем Three.js при загрузке страницы
window.addEventListener('load', function() {
    init();
    animate();
});

// Обновляем размер при изменении окна
window.addEventListener('resize', onWindowResize, false);
