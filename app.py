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

def calculate_metal(width, height, steps, material, has_platform, platform_depth=0, reinforcements_count=1):
    try:
        validate_input(width, height, steps)
        
        # Используем константы из конфигурации
        profile_thickness = app.config['PROFILE_THICKNESS']  # 20 мм
        dpk_depth = app.config['DPK_DEPTH']  # 305 мм
        pvl_depth = app.config['PVL_DEPTH']  # 300 мм
        dpk_reduction = app.config['DPK_REDUCTION']  # 25 мм

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
        
        # Расчет высоты каркаса с учетом материала
        if material == "ДПК":
            frame_height = height - app.config['DPK_REDUCTION']  # 170 - 25 = 145 мм
            step_frame_height = step_height - app.config['DPK_REDUCTION']  # для 2 ступеней: 85 - 25 = 60 мм
        elif material == "ДПК+1 ПВЛ":
            if steps == 1:
                frame_height = height  # Для одной ступени используем ПВЛ
                step_frame_height = step_height
            else:
                # Для первой ступени - полная высота (ПВЛ), для остальных - уменьшенная (ДПК)
                frame_height = height - (app.config['DPK_REDUCTION'] * (steps - 1) / steps)
                step_frame_height = step_height - app.config['DPK_REDUCTION']
        else:
            frame_height = height
            step_frame_height = step_height

        # 1. Основание (прямоугольник)
        # Основание = 2*ширина + (2*глубина*количество_ступеней - 4*толщина профиля)
        base_width_profiles = 2 * width
        base_depth_profiles = 2 * step_depth * steps - 4 * profile_thickness
        base_length = base_width_profiles + base_depth_profiles

        # 2. Профили для ступеней
        # Ступени = (2*ширина + (2*глубина - 4*толщина профиля)) * количество ступеней
        steps_frames = []
        total_steps_length = 0
        for i in range(steps):
            frame_width = 2 * width
            current_depth = platform_depth if (i == steps - 1 and has_platform) else step_depth
            frame_depth = 2 * current_depth - 4 * profile_thickness
            frame_total = frame_width + frame_depth
            steps_frames.append(frame_total)
            total_steps_length += frame_total

        # 3. Вертикальные стойки
        vertical_stands_length = 0
        if steps == 1:
            # Для одной ступени: 4 стойки одинаковой высоты
            # Высота стойки = высота каркаса - толщина профиля сверху и снизу
            stand_height = step_frame_height - 2 * profile_thickness
            vertical_stands_length = 4 * stand_height
        else:
            # Для нескольких ступеней
            for i in range(steps):
                if i == 0:
                    # Первая ступень: 2 передние стойки
                    stand_height = step_frame_height - 2 * profile_thickness
                    vertical_stands_length += 2 * stand_height
                else:
                    # Последующие ступени: 4 стойки от основания
                    # Высота = исходная высота * (номер_ступени + 1) - уменьшение ДПК - толщина профиля сверху и снизу
                    stand_height = (step_height * (i + 1) - app.config['DPK_REDUCTION']) - 2 * profile_thickness
                    vertical_stands_length += 4 * stand_height

        # 4. Усиления
        reinforcements_length = 0
        
        # 4.1 Передние усиления первой ступени
        front_reinforcement = step_frame_height - 2 * profile_thickness
        reinforcements_length += reinforcements_count * front_reinforcement

        # 4.2 Задние усиления последней ступени/площадки
        back_reinforcement = 0
        if has_platform:
            back_reinforcement = (step_height * steps - app.config['DPK_REDUCTION']) - 2 * profile_thickness
            reinforcements_length += reinforcements_count * back_reinforcement

        # 4.3 Внутренние усиления
        for i in range(1, steps):
            # Высота внутреннего усиления = высота до текущей ступени
            internal_height = (step_height * (i + 1) - app.config['DPK_REDUCTION']) - 2 * profile_thickness
            reinforcements_length += reinforcements_count * internal_height

        # 4.4 Усиления глубины (между ширинами каркаса ступеней)
        depth_reinforcements = 0
        for i in range(steps):
            current_depth = platform_depth if (i == steps - 1 and has_platform) else step_depth
            useful_depth = current_depth - 2 * profile_thickness  # вычитаем толщину профилей
            if material != "ПВЛ" and not (material == "ДПК+1 ПВЛ" and i == 0):
                depth_reinforcements += reinforcements_count * useful_depth

        # Общая длина всех усилений
        total_reinforcements = reinforcements_length + depth_reinforcements

        # Итоговая полезная длина всего профиля
        total_length = base_length + total_steps_length + vertical_stands_length + total_reinforcements

        return {
            "base_frame": round(base_length),
            "steps_frames": [round(length) for length in steps_frames],
            "total_steps_frames": round(total_steps_length),
            "vertical_stands": round(vertical_stands_length),
            "reinforcements": {
                "front": round(front_reinforcement * reinforcements_count),
                "back": round(back_reinforcement * reinforcements_count) if has_platform else 0,
                "internal": round((reinforcements_length - front_reinforcement - (back_reinforcement if has_platform else 0)) * reinforcements_count),
                "depth": round(depth_reinforcements),
                "total": round(total_reinforcements)
            },
            "total_length": round(total_length),
            "dimensions": {
                "width": width,
                "height": height,
                "step_height": step_height,
                "frame_height": frame_height,
                "step_frame_height": step_frame_height,
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
