import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Базовые настройки
    DEBUG = False
    TESTING = False
    
    # Безопасность и CORS
    ENABLE_CORS = True
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5000').split(',')
    
    # Ограничения размеров (мм)
    MIN_WIDTH = 300
    MAX_WIDTH = 6000
    MIN_HEIGHT = 100
    MAX_HEIGHT = 3400
    
    # Параметры материалов
    PROFILE_THICKNESS = 20
    DPK_DEPTH = 305
    PVL_DEPTH = 300
    DPK_REDUCTION = 25

class DevelopmentConfig(Config):
    DEBUG = True
    ENABLE_CORS = True

class ProductionConfig(Config):
    pass

def get_config():
    env = os.getenv('FLASK_ENV', 'production')
    return DevelopmentConfig if env == 'development' else ProductionConfig