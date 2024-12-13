from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def calculate_metal(width, height, steps, material, has_platform, platform_depth=0, reinforcements_count=1):
    # Константы
    profile_thickness = 20  # толщина профиля, мм
    dpk_depth = 305  # глубина ступеней ДПК, мм
    pvl_depth = 300  # глубина ступеней ПВЛ, мм
    dpk_reduction = 25  # уменьшение высоты ступени для ДПК, мм

    # Определение полезной глубины ступеней
    if material == "ДПК":
        step_depth = dpk_depth - 2 * profile_thickness
        height_reduction = dpk_reduction
    elif material == "ПВЛ":
        step_depth = pvl_depth - 2 * profile_thickness
        height_reduction = 0
    elif material == "ДПК+1 ПВЛ":
        step_depth = dpk_depth - 2 * profile_thickness
        height_reduction = dpk_reduction
    else:
        return None

    # Расчёты
    step_height = height / steps
    base_length = 2 * width + 2 * step_depth * steps
    if has_platform:
        base_length += 2 * width + 2 * platform_depth
    steps_length = steps * (2 * width + 2 * step_depth)
    vertical_stands = (2 * steps + 2) * step_height
    vertical_reinforcements = reinforcements_count * steps * step_height
    
    # Горизонтальные усиления
    horizontal_reinforcements = 0
    for i in range(steps):
        # Пропускаем усиления для ПВЛ и первой ступени в ДПК+1 ПВЛ
        if material == "ПВЛ" or (material == "ДПК+1 ПВЛ" and i == 0):
            continue
            
        # Используем platform_depth для последней ступени если есть площадка
        current_depth = platform_depth if (i == steps - 1 and has_platform) else step_depth
        horizontal_reinforcements += reinforcements_count * (current_depth - profile_thickness)
    
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
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
