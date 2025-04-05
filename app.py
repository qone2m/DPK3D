from flask import Flask, request, jsonify, render_template  # Импортируем Flask для создания веб-приложения
from flask_cors import CORS  # Импортируем CORS для управления доступом из других доменов
import logging  # Импортируем модуль для логирования (записи событий)
from logging.handlers import RotatingFileHandler  # Для создания логов с ограниченным размером
import os  # Для работы с файловой системой
from config import get_config  # Импортируем настройки приложения из файла config.py

# Определяем базовую директорию, где находится текущий файл
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Указываем папку, где будут храниться HTML-шаблоны
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')

def create_app():
    # Создаем экземпляр приложения Flask
    app = Flask(__name__, template_folder=TEMPLATE_DIR)  # Указываем папку с шаблонами
    app.config.from_object(get_config())  # Загружаем настройки из config.py
    
    # Настраиваем логирование (запись событий в файл)
    if not os.path.exists('logs'):  # Если папка для логов не существует
        os.makedirs('logs')  # Создаем папку для логов
    
    # Создаем обработчик логов, который будет записывать их в файл
    file_handler = RotatingFileHandler(
        'logs/app.log',  # Имя файла для логов
        maxBytes=10240,  # Максимальный размер файла логов (10 КБ)
        backupCount=10  # Количество резервных копий логов
    )
    # Форматируем логи: время, уровень, сообщение, путь к файлу и номер строки
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'  # Исправлен формат строки
    ))
    file_handler.setLevel(logging.INFO)  # Устанавливаем уровень логирования (информационные сообщения)
    app.logger.addHandler(file_handler)  # Добавляем обработчик логов в приложение
    app.logger.setLevel(logging.INFO)  # Устанавливаем общий уровень логирования
    
    # Логирование запросов (запись информации о каждом запросе)
    @app.before_request
    def log_request_info():
        # Логируем метод запроса (GET, POST и т.д.), URL и данные запроса
        if request.is_json:
            app.logger.info(f"Получен запрос: {request.method} {request.url} с данными {request.json}")
        else:
            app.logger.info(f"Получен запрос: {request.method} {request.url} без JSON данных")

    # Глобальная обработка ошибок (если что-то пошло не так)
    @app.errorhandler(Exception)
    def handle_exception(e):
        # Логируем ошибку и возвращаем пользователю сообщение об ошибке
        app.logger.error(f"Ошибка: {e}")
        return jsonify({"error": str(e)}), 500

    # Настраиваем CORS (разрешаем доступ к API из других доменов, если это включено в настройках)
    if app.config.get('ENABLE_CORS', False):  # Проверяем, включен ли CORS
        CORS(app, resources={
            r"/api/*": {"origins": app.config['ALLOWED_ORIGINS']}  # Разрешаем доступ только к API
        })
    
    return app  # Возвращаем настроенное приложение

# Создаем экземпляр приложения
app = create_app()

# Функция для проверки входных данных (ширина, высота, количество ступеней)
def validate_input(width: float, height: float, steps: int) -> None:
    """Проверяет входные параметры на соответствие конфигурационным ограничениям."""
    config = app.config  # Получаем настройки приложения
    
    # Проверяем, что ширина является числом
    if not isinstance(width, (int, float)):
        raise ValueError("Ширина должна быть числом")
    # Проверяем, что ширина находится в допустимом диапазоне
    if not config['MIN_WIDTH'] <= width <= config['MAX_WIDTH']:
        raise ValueError(
            f"Ширина {width} мм вне допустимого диапазона: "
            f"{config['MIN_WIDTH']}..{config['MAX_WIDTH']} мм"
        )
    
    # Проверяем, что высота является числом
    if not isinstance(height, (int, float)):
        raise ValueError("Высота должна быть числом")
    # Проверяем, что высота находится в допустимом диапазоне
    if not config['MIN_HEIGHT'] <= height <= config['MAX_HEIGHT']:
        raise ValueError(
            f"Высота {height} мм вне допустимого диапазона: "
            f"{config['MIN_HEIGHT']}..{config['MAX_HEIGHT']} мм"
        )
    
    # Проверяем, что количество ступеней является целым числом и больше или равно 1
    if not isinstance(steps, int) or steps < 1:
        raise ValueError("Количество ступеней должно быть целым числом ≥ 1")

def calculate_metal(
    width: float, height: float, steps: int, material: str, has_platform: bool,
    platform_depth: float = 0, reinforcements_count: int = 1, paint_consumption: float = 110,
    frame_color: str = 'RAL9005'
) -> dict:
    """Выполняет расчеты металлоконструкций."""
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
            board_elevation = 10  # Подъем доски на 10мм для ДПК
        elif material == "ДПК+1 ПВЛ":
            if steps == 1:
                frame_height = height  # Для одной ступени используем ПВЛ
                step_frame_height = step_height
                board_elevation = 0
            else:
                # Для первой ступени - полная высота (ПВЛ), для остальных - уменьшенная (ДПК)
                frame_height = height - (app.config['DPK_REDUCTION'] * (steps - 1) / steps)
                step_frame_height = step_height - app.config['DPK_REDUCTION']
                board_elevation = 10  # Подъем доски на 10мм для ДПК ступеней (кроме первой)
        else:
            frame_height = height
            step_frame_height = step_height
            board_elevation = 0

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
                # Базовая высота для текущей ступени
                current_height = step_height * (i + 1)
                if material == "ДПК":
                    current_height -= app.config['DPK_REDUCTION']
                elif material == "ДПК+1 ПВЛ":
                    # Для первой ступени ПВЛ не вычитаем, для остальных вычитаем
                    if i > 0:
                        current_height -= app.config['DPK_REDUCTION']
                
                # Вычитаем толщину профиля сверху и снизу
                stand_height = current_height - 2 * profile_thickness
                
                if i == steps - 1:
                    # Последняя ступень: 4 стойки полной высоты
                    vertical_stands_length += 4 * stand_height
                else:
                    # Все остальные ступени: только 2 передние стойки
                    vertical_stands_length += 2 * stand_height

        # 4. Усиления
        reinforcements_length = 0
        
        # 4.1 Передние усиления первой ступени
        front_reinforcement = step_frame_height - 2 * profile_thickness
        reinforcements_length += reinforcements_count * front_reinforcement

        # 4.2 Задние усиления (для последней ступени)
        back_reinforcement = (step_height * steps - (material == "ДПК" and app.config['DPK_REDUCTION'])) - 2 * profile_thickness
        
        # 4.3 Внутренние усиления (170мм на каждое усиление между ступенями)
        internal_reinforcement = 170  # Фиксированная длина внутреннего усиления
        # Количество внутренних усилений = (количество ступеней - 1)
        total_internal_reinforcement = internal_reinforcement * (steps - 1)
        
        # 4.4 Усиления глубины (между ширинами каркаса ступеней)
        depth_reinforcements = 0
        for i in range(steps):
            current_depth = platform_depth if (i == steps - 1 and has_platform) else step_depth
            useful_depth = current_depth - 2 * profile_thickness
            if material != "ПВЛ" and not (material == "ДПК+1 ПВЛ" and i == 0):
                depth_reinforcements += reinforcements_count * useful_depth

        # Общая длина всех усилений
        total_reinforcements = (front_reinforcement + back_reinforcement + total_internal_reinforcement) * reinforcements_count + depth_reinforcements

        # Расчет количества и длины полосок для проушин
        strip_length = 160  # мм
        strip_width = 40    # мм
        strip_thickness = 4 # мм
        strips_count = 2    # 2 проушины на изделие

        # Расчет площади покраски полосок (учитываем все стороны)
        strip_perimeter = (strip_width * 2 + strip_thickness * 2)  # периметр в разрезе
        strip_paint_area = (strip_perimeter * strip_length * strips_count) / 1000000  # площадь в м²
        
        # Расчет площади покраски каркаса
        profile_perimeter = 20 * 4  # 20мм - сторона профиля, 4 стороны
        frame_paint_area = (profile_perimeter * (base_length + total_steps_length + vertical_stands_length + total_reinforcements)) / 1000000  # Площадь в м²
        frame_paint_area += strip_paint_area  # Добавляем площадь полосок

        # Расчет площади покраски ПВЛ (если используется)
        pvl_paint_area = 0
        if material in ["ПВЛ", "ДПК+1 ПВЛ"]:
            if material == "ПВЛ":
                pvl_paint_area = (width * pvl_depth * steps / 1000000) * 2  # Учитываем обе стороны ПВЛ
            else:  # ДПК+1 ПВЛ
                pvl_paint_area = (width * pvl_depth / 1000000) * 2  # Только первая ступень, обе стороны

        # Общая площадь покраски и вес краски
        total_paint_area = frame_paint_area + pvl_paint_area
        frame_paint_weight = frame_paint_area * paint_consumption
        pvl_paint_weight = pvl_paint_area * paint_consumption
        total_paint_weight = frame_paint_weight + pvl_paint_weight

        # Расчет метража доски ДПК (если используется)
        dpk_length = 0
        dpk_boards_count = 0
        if material in ["ДПК", "ДПК+1 ПВЛ"]:
            # На каждую ступень идет 2 доски
            boards_per_step = 2  # Всегда 2 доски на ступень
            if material == "ДПК":
                dpk_boards_count = boards_per_step * steps
                dpk_length = width * steps * boards_per_step  # Общая длина в мм (ширина * кол-во ступеней * 2 доски)
            else:  # ДПК+1 ПВЛ
                dpk_boards_count = boards_per_step * (steps - 1)  # Первая ступень ПВЛ
                dpk_length = width * (steps - 1) * boards_per_step  # Общая длина в мм

        # Определяем цвет доски ДПК в зависимости от цвета каркаса
        dpk_color_mapping = {
            'RAL9005': 'Венге',
            'RAL8017': 'Коричневый',
            'RAL7024': 'Серый'
        }
        dpk_color = dpk_color_mapping.get(frame_color, 'Венге')  # По умолчанию Венге

        # Расчет количества болтов и гаек (4 болта и 4 гайки на ступень)
        bolts_per_step = 4  # 4 болта на ступень (2 доски * 2 болта)
        if material == "ДПК":
            bolts_count = bolts_per_step * steps
        else:  # ДПК+1 ПВЛ
            bolts_count = bolts_per_step * (steps - 1)
        nuts_count = bolts_count  # Количество гаек равно количеству болтов

        return {
            "base_frame": {
                "mm": round(base_length),
                "m": round(base_length / 1000, 2)
            },
            "steps_frames": {
                "mm": [round(length) for length in steps_frames],
                "m": [round(length / 1000, 2) for length in steps_frames],
                "total_mm": round(total_steps_length),
                "total_m": round(total_steps_length / 1000, 2)
            },
            "vertical_stands": {
                "mm": round(vertical_stands_length),
                "m": round(vertical_stands_length / 1000, 2)
            },
            "reinforcements": {
                "front": {"mm": round(front_reinforcement * reinforcements_count), "m": round((front_reinforcement * reinforcements_count) / 1000, 2)},
                "back": {"mm": round(back_reinforcement * reinforcements_count), "m": round((back_reinforcement * reinforcements_count) / 1000, 2)},
                "internal": {"mm": round(total_internal_reinforcement * reinforcements_count), "m": round((total_internal_reinforcement * reinforcements_count) / 1000, 2)},
                "depth": {"mm": round(depth_reinforcements), "m": round(depth_reinforcements / 1000, 2)},
                "total": {"mm": round(total_reinforcements), "m": round(total_reinforcements / 1000, 2)}
            },
            "total_length": {
                "mm": round(base_length + total_steps_length + vertical_stands_length + total_reinforcements + strip_length * strips_count),
                "m": round((base_length + total_steps_length + vertical_stands_length + total_reinforcements + strip_length * strips_count) / 1000, 2)
            },
            "additional_materials": {
                "dpk_length": round(dpk_length / 1000, 2),
                "dpk_boards": dpk_boards_count,
                "dpk_color": dpk_color if material in ["ДПК", "ДПК+1 ПВЛ"] else None,
                "bolts_count": bolts_count,
                "nuts_count": nuts_count,
                "mounting_strips": {
                    "count": strips_count,
                    "size": f"{strip_length}x{strip_width}x{strip_thickness}",
                    "total_length": strip_length * strips_count
                }
            },
            "paint": {
                "frame_area": round(frame_paint_area, 2),
                "frame_weight": round(frame_paint_weight, 2),
                "pvl_area": round(pvl_paint_area, 2),
                "pvl_weight": round(pvl_paint_weight, 2),
                "total_area": round(total_paint_area, 2),
                "total_weight": round(total_paint_weight, 2),
                "consumption": paint_consumption
            },
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
                "material": material,
                "board_elevation": board_elevation,
                "frame_color": frame_color
            }
        }
    except ValueError as e:
        app.logger.error(f"Ошибка валидации: {e}")
        return None

@app.route('/')
def index():
    # Отображаем главную страницу с выбором вариантов
    return render_template('index_choose.html')

@app.route('/eco.html')
def eco():
    # Отображаем страницу с вариантом "Эко"
    return render_template('eco.html')
    
@app.route('/optima.html')
def optima():
    # Отображаем страницу с вариантом "Оптима"
    return render_template('optima.html')
    
@app.route('/komfort.html')
def komfort():
    # Отображаем страницу с вариантом "Комфорт"
    return render_template('komfort.html')
    
@app.route('/api/calculate', methods=['POST'])   
def calculate():
    """API-метод для расчета металлоконструкций."""
    try:
        if not request.is_json:
            raise ValueError("Content-Type должен быть 'application/json'")
        data = request.get_json()
        # Извлекаем параметры из запроса
        width = float(data['width'])  # Ширина конструкции
        height = float(data['height'])  # Высота конструкции
        steps = int(data['steps'])  # Количество ступеней
        material = data['material']  # Материал ступеней
        has_platform = data['has_platform']  # Наличие платформы
        platform_depth = float(data['platform_depth']) if has_platform else 0  # Глубина платформы (если есть)
        reinforcements_count = int(data.get('reinforcements_count', 1))  # Количество усилений (по умолчанию 1)
        paint_consumption = float(data.get('paint_consumption', 110))  # Расход краски (г/м²)
        frame_color = data.get('frame_color', 'RAL9005')  # Цвет каркаса (по умолчанию черный)

        # Выполняем расчет металлоконструкции
        result = calculate_metal(width, height, steps, material, has_platform, platform_depth, reinforcements_count, paint_consumption, frame_color)
        if result is None:
            # Если расчет не удался, возвращаем ошибку
            return jsonify({"error": "Неверный материал"}), 400

        return jsonify(result)  # Возвращаем результат в формате JSON
    except KeyError as e:
        app.logger.error(f"Ошибка обработки запроса: отсутствует ключ {e}")
        return jsonify({"error": f"Отсутствует обязательный параметр: {e}"}), 400
    except ValueError as e:
        app.logger.error(f"Ошибка валидации: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        app.logger.error(f"Неизвестная ошибка: {e}")
        return jsonify({"error": "Внутренняя ошибка сервера"}), 500

if __name__ == '__main__':
    # Запускаем приложение на локальном сервере
    debug = app.config['DEBUG']  # Проверяем, включен ли режим отладки
    app.run(host='0.0.0.0', port=5000, debug=debug)  # Запускаем сервер на порту 5000