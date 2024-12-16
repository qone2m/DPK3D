class Config:
    DEBUG = False
    TESTING = False
    
    # Ограничения размеров
    MIN_WIDTH = 600   # мм
    MAX_WIDTH = 2000  # мм
    MIN_HEIGHT = 100  # мм
    MAX_HEIGHT = 3000 # мм
    MIN_STEP_HEIGHT = 150  # мм
    MAX_STEP_HEIGHT = 200  # мм
    
    # Размеры материалов
    PROFILE_THICKNESS = 20  # мм
    DPK_DEPTH = 305        # мм
    PVL_DEPTH = 300        # мм
    DPK_REDUCTION = 25     # мм

class DevelopmentConfig(Config):
    DEBUG = True
    
class ProductionConfig(Config):
    pass
