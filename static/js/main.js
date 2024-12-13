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

    // Добавление осей координат
    const axesHelper = new THREE.AxesHelper(500);
    scene.add(axesHelper);

    // Добавление OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

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

    const {width, height, step_height, step_depth, profile_thickness} = dimensions;
    const steps = Math.round(height / step_height);

    // Материал для профиля 20х20
    const frameMaterial = new THREE.MeshPhongMaterial({
        color: 0x404040,
        opacity: 1,
        transparent: false
    });

    // 1. Горизонтальное основание на земле
    // Продольные балки основания - от переднего края до заднего
    const totalDepth = step_depth * (steps - 1) + step_depth - profile_thickness; // Корректируем общую глубину
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
    backBaseBeam.position.set(0, 0, totalDepth);
    stairModel.add(backBaseBeam);

    // 2. Горизонтальные ступени и их опоры
    for (let i = 0; i < steps; i++) {
        // Рама ступени (передняя и задняя балки)
        const stepFrameGeometry = new THREE.BoxGeometry(width, profile_thickness, profile_thickness);
        
        // Передняя балка ступени
        const frontStepBeam = new THREE.Mesh(stepFrameGeometry, frameMaterial);
        frontStepBeam.position.set(0, (i + 1) * step_height, i * step_depth);
        stairModel.add(frontStepBeam);
        
        // Задняя балка ступени
        const backStepBeam = new THREE.Mesh(stepFrameGeometry, frameMaterial);
        backStepBeam.position.set(0, (i + 1) * step_height, i * step_depth + step_depth - profile_thickness);
        stairModel.add(backStepBeam);
        
        // Боковые балки ступени
        const sideSupportGeometry = new THREE.BoxGeometry(profile_thickness, profile_thickness, step_depth - profile_thickness);
        
        // Левая боковая балка
        const leftSideSupport = new THREE.Mesh(sideSupportGeometry, frameMaterial);
        leftSideSupport.position.set(-width/2 + profile_thickness/2, (i + 1) * step_height, i * step_depth + (step_depth - profile_thickness)/2);
        stairModel.add(leftSideSupport);
        
        // Правая боковая балка
        const rightSideSupport = new THREE.Mesh(sideSupportGeometry, frameMaterial);
        rightSideSupport.position.set(width/2 - profile_thickness/2, (i + 1) * step_height, i * step_depth + (step_depth - profile_thickness)/2);
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
        if (i === steps - 1) {
            const backLeftStand = new THREE.Mesh(leftStandGeometry, frameMaterial);
            backLeftStand.position.set(-width/2 + profile_thickness/2, ((i + 1) * step_height)/2, i * step_depth + step_depth - profile_thickness);
            stairModel.add(backLeftStand);
            
            const backRightStand = new THREE.Mesh(rightStandGeometry, frameMaterial);
            backRightStand.position.set(width/2 - profile_thickness/2, ((i + 1) * step_height)/2, i * step_depth + step_depth - profile_thickness);
            stairModel.add(backRightStand);
        }
    }

    // Функция для расчета количества усилений в зависимости от ширины
    function calculateReinforcementsCount(width) {
        if (width <= 1000) return 1;
        return Math.ceil((width - 1000) / 300) + 1;
    }

    // Добавляем усиления
    const reinforcementsCount = calculateReinforcementsCount(width);
    const spacing = (width - 2 * profile_thickness) / (reinforcementsCount + 1);
    
    // Усиления для каждой ступени
    for (let i = 0; i < steps; i++) {
        const startY = i * step_height;
        
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
                // Усиление соединяет низ переда вышестоящей ступени 
                // с задней стороной заднего профиля нижестоящей ступени
                const standGeometry = new THREE.BoxGeometry(profile_thickness, step_height, profile_thickness);
                const stand = new THREE.Mesh(standGeometry, frameMaterial);
                stand.position.set(
                    xPos, 
                    startY + step_height/2, 
                    // Позиционируем у задней части нижестоящей ступени
                    // и сдвигаем на ширину профиля назад
                    (i-1) * step_depth + step_depth
                );
                stairModel.add(stand);
            }
        }

        // Для последней ступени - дополнительное вертикальное усиление от задней части до основания
        if (i === steps - 1) {
            const lastStepZ = i * step_depth;
            
            for (let j = 0; j < reinforcementsCount; j++) {
                const xPos = -width/2 + profile_thickness + spacing * (j + 1);
                const height = (i + 1) * step_height;
                
                const backStandGeometry = new THREE.BoxGeometry(profile_thickness, height, profile_thickness);
                const backStand = new THREE.Mesh(backStandGeometry, frameMaterial);
                backStand.position.set(xPos, height/2, lastStepZ + step_depth - profile_thickness);
                stairModel.add(backStand);
            }
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
            parseFloat(document.getElementById('platform-depth').value) : 0
    };

    try {
        const response = await fetch('http://192.168.0.149:5000/api/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        
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

// Кнопки управления камерой
document.getElementById('rotate-left').addEventListener('click', () => {
    controls.rotateLeft(Math.PI / 4);
});

document.getElementById('rotate-right').addEventListener('click', () => {
    controls.rotateLeft(-Math.PI / 4);
});

document.getElementById('zoom-in').addEventListener('click', () => {
    camera.position.multiplyScalar(0.8);
});

document.getElementById('zoom-out').addEventListener('click', () => {
    camera.position.multiplyScalar(1.2);
});

// Инициализация при загрузке страницы
init();
