from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from config import DevelopmentConfig, ProductionConfig
import logging
from logging.handlers import RotatingFileHandler
import os

app = Flask(__name__)
app.config.from_object(DevelopmentConfig if app.debug else ProductionConfig)
CORS(app)

# Настройка логирования
if not os.path.exists('logs'):
    os.makedirs('logs')

file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240, backupCount=10)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)
app.logger.info('Stair Calculator startup')

def validate_input(width, height, steps):
    if not app.config['MIN_WIDTH'] <= width <= app.config['MAX_WIDTH']:
        raise ValueError(f"Ширина должна быть от {app.config['MIN_WIDTH']} до {app.config['MAX_WIDTH']} мм")
    if not app.config['MIN_HEIGHT'] <= height <= app.config['MAX_HEIGHT']:
        raise ValueError(f"Высота должна быть от {app.config['MIN_HEIGHT']} до {app.config['MAX_HEIGHT']} мм")
    
    # Для одной ступени пропускаем проверку высоты ступени
    if steps > 1:
        step_height = height / steps
        if not app.config['MIN_STEP_HEIGHT'] <= step_height <= app.config['MAX_STEP_HEIGHT']:
            raise ValueError(f"Высота ступени ({step_height:.1f} мм) должна быть от {app.config['MIN_STEP_HEIGHT']} до {app.config['MAX_STEP_HEIGHT']} мм")

def calculate_metal(width, height, steps, material, has_platform, platform_depth=0, reinforcements_count=1):
    try:
        validate_input(width, height, steps)
        
        # Используем константы из конфигурации
        profile_thickness = app.config['PROFILE_THICKNESS']
        dpk_depth = app.config['DPK_DEPTH']
        pvl_depth = app.config['PVL_DEPTH']
        dpk_reduction = app.config['DPK_REDUCTION']

        # Определяем глубину ступени в зависимости от материала
        if material == "ПВЛ":
            step_depth = pvl_depth
        elif material == "ДПК":
            step_depth = dpk_depth
        elif material == "ДПК+1 ПВЛ":
            step_depth = dpk_depth  # Все ступени будут глубиной 305, кроме первой
        else:
            return None

        # Расчёты
        step_height = height / steps
        
        # Расчет длины основания с учетом полезной длины
        base_frame_length = 2 * width  # 2 ширины целиком
        base_frame_depth = 2 * step_depth - 4 * profile_thickness  # 2 глубины минус 4 профиля
        base_length = base_frame_length + base_frame_depth
        
        if has_platform:
            platform_frame_length = 2 * width  # 2 ширины целиком
            platform_frame_depth = 2 * platform_depth - 4 * profile_thickness  # 2 глубины минус 4 профиля
            base_length += platform_frame_length + platform_frame_depth
        
        # Длина профиля для ступеней (2 ширины + 2 полезные глубины для каждой ступени)
        steps_length = steps * (2 * width + (2 * step_depth - 4 * profile_thickness))
        
        # Вертикальные стойки (полезная высота = высота - толщина профиля сверху)
        vertical_stands = (2 * steps + 2) * (step_height - profile_thickness)
        
        # Вертикальные усиления (также с учетом полезной высоты)
        vertical_reinforcements = reinforcements_count * steps * (step_height - profile_thickness)
        
        # Горизонтальные усиления
        horizontal_reinforcements = 0
        for i in range(steps):
            # Пропускаем усиления для ПВЛ и первой ступени в ДПК+1 ПВЛ
            if material == "ПВЛ" or (material == "ДПК+1 ПВЛ" and i == 0):
                continue
            
            # Используем platform_depth для последней ступени если есть площадка
            current_depth = platform_depth if (i == steps - 1 and has_platform) else step_depth
            # Вычитаем толщину профиля с обеих сторон для полезной длины
            horizontal_reinforcements += reinforcements_count * (current_depth - 2 * profile_thickness)
        
        total_length = base_length + steps_length + vertical_stands + vertical_reinforcements + horizontal_reinforcements

        return {
            "base_length": round(base_length),
            "steps_length": round(steps_length),
            "vertical_stands": round(vertical_stands),
            "reinforcements": round(vertical_reinforcements + horizontal_reinforcements),
            "total_length": round(total_length),
            "dimensions": {
                "width": width,
                "height": height,
                "step_height": step_height,
                "step_depth": step_depth,
                "profile_thickness": profile_thickness,
                "has_platform": has_platform,
                "platform_depth": platform_depth,
                "reinforcements_count": reinforcements_count,
                "material": material
            }
        }
    except ValueError as e:
        app.logger.error(f"Ошибка валидации: {e}")
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/calculate', methods=['POST'])
def calculate():
    data = request.json
    try:
        width = float(data['width'])
        height = float(data['height'])
        steps = int(data['steps'])
        material = data['material']
        has_platform = data['has_platform']
        platform_depth = float(data['platform_depth']) if has_platform else 0
        reinforcements_count = int(data.get('reinforcements_count', 1))

        result = calculate_metal(width, height, steps, material, has_platform, platform_depth, reinforcements_count)
        if result is None:
            return jsonify({"error": "Неверный материал"}), 400

        return jsonify(result)
    except (KeyError, ValueError) as e:
        app.logger.error(f"Ошибка обработки запроса: {e}")
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, host='localhost', port=5000)
