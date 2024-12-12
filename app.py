from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def calculate_metal(width, height, steps, material, has_platform, platform_depth=0):
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
    reinforcements = ((width // 500) + 1) * steps * step_height
    total_length = base_length + steps_length + vertical_stands + reinforcements

    return {
        "base_length": round(base_length),
        "steps_length": round(steps_length),
        "vertical_stands": round(vertical_stands),
        "reinforcements": round(reinforcements),
        "total_length": round(total_length),
        "dimensions": {
            "width": width,
            "height": height,
            "step_height": step_height,
            "step_depth": step_depth,
            "profile_thickness": profile_thickness
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

        result = calculate_metal(width, height, steps, material, has_platform, platform_depth)
        if result is None:
            return jsonify({"error": "Неверный материал"}), 400

        return jsonify(result)
    except (KeyError, ValueError) as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)
