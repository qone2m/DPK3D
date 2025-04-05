import os
from dotenv import load_dotenv

# Загружаем переменные окружения из файла .env
load_dotenv()

class Config:
    # Базовые настройки
    DEBUG: bool = False  # Включить/выключить режим отладки. True для разработки, False для продакшена.
    TESTING: bool = False  # Включить/выключить режим тестирования. Используется для тестов.

    # Безопасность и CORS
    ENABLE_CORS: bool = True  # Включить/выключить поддержку CORS. True для API, доступного извне.
    ALLOWED_ORIGINS: list[str] = os.getenv(
        'ALLOWED_ORIGINS', 'http://localhost:5000'
    ).split(',')  # Список разрешённых источников. Пример: 'http://example.com,http://api.example.com'

    # Ограничения размеров (мм)
    MIN_WIDTH: int = 300  # Минимальная ширина. Измените при необходимости, например, 200.
    MAX_WIDTH: int = 6000  # Максимальная ширина. Измените при необходимости, например, 8000.
    MIN_HEIGHT: int = 100  # Минимальная высота. Измените при необходимости, например, 50.
    MAX_HEIGHT: int = 3400  # Максимальная высота. Измените при необходимости, например, 4000.

    # Параметры материалов
    PROFILE_THICKNESS: int = 20  # Толщина профиля. Пример: 15, 25.
    DPK_DEPTH: int = 305  # Глубина DPK. Пример: 300, 310.
    PVL_DEPTH: int = 300  # Глубина PVL. Пример: 290, 310.
    DPK_REDUCTION: int = 25  # Уменьшение DPK. Пример: 20, 30.

class DevelopmentConfig(Config):
    # Конфигурация для разработки
    DEBUG: bool = True  # Включён режим отладки.
    ENABLE_CORS: bool = True  # CORS включён для разработки.

class ProductionConfig(Config):
    # Конфигурация для продакшена
    pass  # Используются настройки по умолчанию из Config.

def get_config() -> Config:
    """
    Возвращает экземпляр соответствующего класса конфигурации
    в зависимости от переменной окружения FLASK_ENV.

    Возможные значения FLASK_ENV:
    - 'development': возвращает DevelopmentConfig.
    - 'production': возвращает ProductionConfig (по умолчанию).
    """
    env = os.getenv('FLASK_ENV', 'production').lower()  # Получаем значение FLASK_ENV, по умолчанию 'production'.
    return DevelopmentConfig() if env == 'development' else ProductionConfig()