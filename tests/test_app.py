import unittest
from app import app, calculate_metal

class TestApp(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_home_page(self):
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)

    def test_calculate_metal_valid(self):
        result = calculate_metal(
            width=800,
            height=2000,
            steps=10,
            material="ДПК",
            has_platform=False
        )
        self.assertIsNotNone(result)
        self.assertIn('total_length', result)
        self.assertIn('dimensions', result)

    def test_calculate_metal_invalid(self):
        result = calculate_metal(
            width=100,  # слишком маленькая ширина
            height=2000,
            steps=10,
            material="ДПК",
            has_platform=False
        )
        self.assertIsNone(result)

    def test_api_calculate_valid(self):
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
        response = self.app.post('/api/calculate', json={
            'width': 100,  # слишком маленькая ширина
            'height': 2000,
            'steps': 10,
            'material': 'ДПК',
            'has_platform': False
        })
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
