import unittest
import sys
import os

# Добавляем корневую директорию проекта в PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app, calculate_metal  # Импорт приложения и функции расчета

class TestApp(unittest.TestCase):
    def setUp(self):
        # Настройка тестового клиента Flask
        self.app = app.test_client()
        self.app.testing = True

    def test_home_page(self):
        # Проверка доступности главной страницы
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)

    def test_calculate_metal_valid(self):
        # Проверка корректного расчета металлокаркаса
        result = calculate_metal(
            width=300,
            height=2000,
            steps=10,
            material="ДПК",
            has_platform=False
        )
        self.assertIsNotNone(result)
        self.assertIn('total_length', result)
        self.assertIn('dimensions', result)

    def test_calculate_metal_invalid(self):
        # Проверка обработки некорректных входных данных (слишком маленькая ширина)
        result = calculate_metal(
            width=800,  # слишком маленькая ширина
            height=1700,
            steps=10,
            material="ДПК",
            has_platform=False
        )
        self.assertIsNone(result)

    def test_calculate_metal_invalid_material(self):
        # Проверка обработки некорректного материала
        result = calculate_metal(
            width=800,
            height=2000,
            steps=10,
            material="НекорректныйМатериал",  # материал не поддерживается
            has_platform=False
        )
        self.assertIsNone(result)

    def test_api_calculate_valid(self):
        # Проверка API с корректными данными
        response = self.app.post('/api/calculate', json={
            'width': 800,
            'height': 2000,
            'steps': 10,
            'material': 'ДПК',
            'has_platform': False,
            'platform_depth': 0,
            'reinforcements_count': 1
        })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('total_length', data)

    def test_api_calculate_invalid(self):
        # Проверка API с некорректными данными (слишком маленькая ширина)
        response = self.app.post('/api/calculate', json={
            'width': 100,  # слишком маленькая ширина
            'height': 2000,
            'steps': 10,
            'material': 'ДПК',
            'has_platform': False
        })
        self.assertEqual(response.status_code, 400)

    def test_api_calculate_missing_parameters(self):
        # Проверка API с отсутствующими обязательными параметрами
        response = self.app.post('/api/calculate', json={
            'width': 800,
            'height': 2000
            # отсутствуют параметры steps, material, has_platform
        })
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
