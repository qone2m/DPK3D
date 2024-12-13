let scene, camera, renderer, controls;
let stairModel = new THREE.Group();

// Инициализация Three.js
function init() {
    // Создание сцены
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // Настройка камеры
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(1000, 1000, 1000);

    // Создание рендерера
    const container = document.getElementById('canvas-container');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    container.appendChild(renderer.domElement);

    // Добавление освещения
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Добавление OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Добавление видового куба
    const viewCubeCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
    const viewCubeScene = new THREE.Scene();
    viewCubeScene.background = new THREE.Color(0xf0f0f0);

    // Создание видового куба
    const viewCubeSize = 100;
    const viewCubeGeometry = new THREE.BoxGeometry(viewCubeSize, viewCubeSize, viewCubeSize);
    const materials = [
        new THREE.MeshBasicMaterial({ color: 0xe0e0e0, transparent: true, opacity: 0.8 }), // right
        new THREE.MeshBasicMaterial({ color: 0xe0e0e0, transparent: true, opacity: 0.8 }), // left
        new THREE.MeshBasicMaterial({ color: 0xe0e0e0, transparent: true, opacity: 0.8 }), // top
        new THREE.MeshBasicMaterial({ color: 0xe0e0e0, transparent: true, opacity: 0.8 }), // bottom
        new THREE.MeshBasicMaterial({ color: 0xe0e0e0, transparent: true, opacity: 0.8 }), // front
        new THREE.MeshBasicMaterial({ color: 0xe0e0e0, transparent: true, opacity: 0.8 })  // back
    ];

    const viewCube = new THREE.Mesh(viewCubeGeometry, materials);
    viewCubeScene.add(viewCube);

    // Добавление подписей на гранях куба
    const loader = new THREE.TextureLoader();
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const labels = ['Спереди', 'Сзади', 'Сверху', 'Снизу', 'Справа', 'Слева'];
    labels.forEach((label, index) => {
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillText(label, 32, 32);
        const texture = new THREE.CanvasTexture(canvas);
        materials[index].map = texture;
    });

    // Позиционирование видового куба
    viewCubeCamera.position.set(0, 0, 300);
    viewCubeCamera.lookAt(0, 0, 0);

    // Создание отдельного рендерера для видового куба
    const viewCubeRenderer = new THREE.WebGLRenderer({ alpha: true });
    viewCubeRenderer.setSize(150, 150);
    viewCubeRenderer.domElement.style.position = 'absolute';
    viewCubeRenderer.domElement.style.top = '10px';
    viewCubeRenderer.domElement.style.right = '10px';
    container.appendChild(viewCubeRenderer.domElement);

    // Обработчик кликов по видовому кубу
    viewCubeRenderer.domElement.addEventListener('click', function(event) {
        const rect = viewCubeRenderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Определение выбранной грани и установка соответствующего вида
        if (Math.abs(x) > Math.abs(y)) {
            if (x > 0) camera.position.set(2000, 0, 0); // Справа
            else camera.position.set(-2000, 0, 0);      // Слева
        } else {
            if (y > 0) camera.position.set(0, 2000, 0); // Сверху
            else camera.position.set(0, -2000, 0);      // Снизу
        }
        camera.lookAt(0, 0, 0);
        controls.update();
    });

    // Анимация видового куба
    function animateViewCube() {
        requestAnimationFrame(animateViewCube);
        viewCube.rotation.copy(camera.rotation);
        viewCubeRenderer.render(viewCubeScene, viewCubeCamera);
    }
    animateViewCube();

    // Обработчик изменения размера окна
    window.addEventListener('resize', onWindowResize, false);

    animate();
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function createStairModel(dimensions) {
    // Удаляем старую модель
    scene.remove(stairModel);
    stairModel = new THREE.Group();

    const {width, height, step_height, step_depth, profile_thickness, has_platform, platform_depth, reinforcements_count, material} = dimensions;
    console.log('Material in createStairModel:', material); // Отладочный вывод
    const steps = Math.round(height / step_height);

    // Определяем необходимость горизонтальных усилений для каждой ступени
    function needsHorizontalReinforcement(stepIndex) {
        console.log('Checking step', stepIndex, 'material:', material); // Отладочный вывод
        if (material === "ПВЛ") {
            console.log('ПВЛ - no reinforcement needed');
            return false;
        }
        if (material === "ДПК+1 ПВЛ" && stepIndex === 0) {
            console.log('ДПК+1 ПВЛ, first step - no reinforcement needed');
            return false;
        }
        if (material === "ДПК") {
            console.log('ДПК - reinforcement needed');
            return true;
        }
        if (material === "ДПК+1 ПВЛ" && stepIndex > 0) {
            console.log('ДПК+1 ПВЛ, not first step - reinforcement needed');
            return true;
        }
        console.log('Default case - no reinforcement needed');
        return false;
    }

    // Материал для профиля 20х20
    const frameMaterial = new THREE.MeshPhongMaterial({
        color: 0x404040,
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
        const currentStepDepth = isLastStep ? (has_platform ? platform_depth : 0) : step_depth;
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
            if (needsHorizontalReinforcement(i)) {
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

    // Центрируем модель
    stairModel.position.set(0, 0, -step_depth * (steps-1) / 2);
    scene.add(stairModel);

    // Настраиваем камеру для лучшего обзора
    camera.position.set(width * 2, height * 1.5, width * 2);
    camera.lookAt(0, height/2, 0);
    controls.update();
}

// Обработчики событий
document.getElementById('calculator-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        width: parseFloat(document.getElementById('width').value),
        height: parseFloat(document.getElementById('height').value),
        steps: parseInt(document.getElementById('steps').value),
        material: document.getElementById('material').value,
        has_platform: document.getElementById('has-platform').checked,
        platform_depth: document.getElementById('has-platform').checked ? 
            parseFloat(document.getElementById('platform-depth').value) : 0,
        reinforcements_count: parseInt(document.getElementById('reinforcements-count').value) || 1
    };

    try {
        console.log('Sending data:', formData); // Добавляем отладочный вывод
        const response = await fetch('http://192.168.0.149:5000/api/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        console.log('Received data:', data); // Добавляем отладочный вывод
        
        if (response.ok) {
            // Обновляем 3D модель
            createStairModel(data.dimensions);
            
            // Отображаем результаты
            const resultDiv = document.getElementById('result');
            const resultDetails = document.getElementById('result-details');
            resultDiv.classList.remove('hidden');
            
            resultDetails.innerHTML = `
                <p><strong>Длина профиля для основания:</strong> ${data.base_length} мм</p>
                <p><strong>Длина профиля для ступеней:</strong> ${data.steps_length} мм</p>
                <p><strong>Длина профиля для вертикальных стоек:</strong> ${data.vertical_stands} мм</p>
                <p><strong>Длина профиля для усилений:</strong> ${data.reinforcements} мм</p>
                <p><strong>Общая длина профиля:</strong> ${data.total_length} мм</p>
            `;
        } else {
            alert(data.error || 'Произошла ошибка при расчете');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Произошла ошибка при отправке запроса');
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

// Инициализация при загрузке страницы
init();
