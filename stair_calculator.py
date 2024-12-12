import tkinter as tk
from tkinter import ttk, messagebox
from ttkthemes import ThemedTk
import vtk
from PyQt5.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget
from vtk.qt.QVTKRenderWindowInteractor import QVTKRenderWindowInteractor
import sys

class Visualization3DWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("3D Визуализация")
        self.setGeometry(800, 100, 800, 600)

        # Создаем центральный виджет
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        layout = QVBoxLayout(self.central_widget)

        # Создаем VTK рендерер
        self.renderer = vtk.vtkRenderer()
        self.renderer.SetBackground(1.0, 1.0, 1.0)  # Белый фон
        self.render_window = vtk.vtkRenderWindow()
        self.render_window.AddRenderer(self.renderer)

        # Создаем интерактор VTK
        self.interactor = QVTKRenderWindowInteractor(self.central_widget, rw=self.render_window)
        layout.addWidget(self.interactor)

        # Инициализируем интерактор
        self.interactor.Initialize()
        self.interactor.Start()

        # Добавляем оси координат
        axes = vtk.vtkAxesActor()
        self.renderer.AddActor(axes)

        # Настраиваем камеру
        self.renderer.ResetCamera()
        self.render_window.Render()

    def update_model(self, width, height, steps, material, platform=False, platform_depth=0):
        # Очищаем предыдущую визуализацию
        self.renderer.RemoveAllViewProps()
        
        # Добавляем оси координат
        axes = vtk.vtkAxesActor()
        self.renderer.AddActor(axes)
        
        # Константы
        profile_thickness = 20
        step_height = height / steps
        
        # Создаем каркас лестницы
        for i in range(steps):
            # Создаем ступень
            step = vtk.vtkCubeSource()
            step.SetXLength(width)
            step.SetYLength(profile_thickness)
            step.SetZLength(300)  # Глубина ступени
            
            # Позиционируем ступень
            transform = vtk.vtkTransform()
            transform.Translate(0, i * step_height, i * 300)
            
            # Применяем трансформацию
            transformFilter = vtk.vtkTransformPolyDataFilter()
            transformFilter.SetInputConnection(step.GetOutputPort())
            transformFilter.SetTransform(transform)
            transformFilter.Update()
            
            # Добавляем ступень в рендерер
            mapper = vtk.vtkPolyDataMapper()
            mapper.SetInputConnection(transformFilter.GetOutputPort())
            
            actor = vtk.vtkActor()
            actor.SetMapper(mapper)
            actor.GetProperty().SetColor(0.8, 0.8, 0.8)  # Серый цвет
            actor.GetProperty().SetOpacity(0.7)  # Полупрозрачность
            
            self.renderer.AddActor(actor)
            
            # Добавляем вертикальные стойки
            if i < steps:
                # Левая стойка
                left_support = vtk.vtkCubeSource()
                left_support.SetXLength(profile_thickness)
                left_support.SetYLength(step_height)
                left_support.SetZLength(profile_thickness)
                
                left_transform = vtk.vtkTransform()
                left_transform.Translate(0, i * step_height + step_height/2, i * 300)
                
                left_filter = vtk.vtkTransformPolyDataFilter()
                left_filter.SetInputConnection(left_support.GetOutputPort())
                left_filter.SetTransform(left_transform)
                left_filter.Update()
                
                left_mapper = vtk.vtkPolyDataMapper()
                left_mapper.SetInputConnection(left_filter.GetOutputPort())
                
                left_actor = vtk.vtkActor()
                left_actor.SetMapper(left_mapper)
                left_actor.GetProperty().SetColor(0.7, 0.7, 0.7)
                
                self.renderer.AddActor(left_actor)
                
                # Правая стойка
                right_support = vtk.vtkCubeSource()
                right_support.SetXLength(profile_thickness)
                right_support.SetYLength(step_height)
                right_support.SetZLength(profile_thickness)
                
                right_transform = vtk.vtkTransform()
                right_transform.Translate(width, i * step_height + step_height/2, i * 300)
                
                right_filter = vtk.vtkTransformPolyDataFilter()
                right_filter.SetInputConnection(right_support.GetOutputPort())
                right_filter.SetTransform(right_transform)
                right_filter.Update()
                
                right_mapper = vtk.vtkPolyDataMapper()
                right_mapper.SetInputConnection(right_filter.GetOutputPort())
                
                right_actor = vtk.vtkActor()
                right_actor.SetMapper(right_mapper)
                right_actor.GetProperty().SetColor(0.7, 0.7, 0.7)
                
                self.renderer.AddActor(right_actor)
            
            # Добавляем размерные линии и текст
            self.add_dimension_text(f"{width}мм", width/2, i * step_height, i * 300, 0.0, 0.0, 0.0)  # Черный текст
            self.add_dimension_text(f"{step_height:.0f}мм", width + 50, i * step_height, i * 300, 0.0, 0.0, 0.0)
        
        # Настраиваем камеру
        self.renderer.ResetCamera()
        self.render_window.Render()

    def add_dimension_text(self, text, x, y, z, r=0.0, g=0.0, b=0.0):
        # Создаем текст
        text_actor = vtk.vtkTextActor3D()
        text_actor.SetInput(text)
        text_actor.SetPosition(x, y, z)
        text_actor.GetTextProperty().SetFontSize(14)
        text_actor.GetTextProperty().SetColor(r, g, b)  # Цвет текста
        self.renderer.AddActor(text_actor)

class StairCalculator:
    def __init__(self):
        # Инициализация Qt
        self.app = QApplication.instance()
        if not self.app:
            self.app = QApplication(sys.argv)

        # Создаем окно визуализации
        self.vis_window = Visualization3DWindow()
        self.vis_window.show()

        # Создаем основное окно Tkinter
        self.root = ThemedTk(theme="arc")
        self.root.title("Калькулятор лестницы")
        self.root.geometry("400x600")
        
        # Создаем основной контейнер
        self.main_frame = ttk.Frame(self.root, padding="10")
        self.main_frame.grid(row=0, column=0, sticky="nsew")
        
        # Создаем фрейм для ввода
        self.input_frame = ttk.LabelFrame(self.main_frame, text="Параметры лестницы", padding="10")
        self.input_frame.grid(row=0, column=0, sticky="nsew", padx=5, pady=5)
        
        self.setup_inputs()
        
        # Настройка весов для адаптивного размера
        self.root.grid_columnconfigure(0, weight=1)
        self.root.grid_rowconfigure(0, weight=1)
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(0, weight=1)

    def setup_inputs(self):
        # Ширина лестницы
        ttk.Label(self.input_frame, text="Ширина лестницы (мм):").grid(row=0, column=0, sticky="w", pady=2)
        self.width_entry = ttk.Entry(self.input_frame)
        self.width_entry.grid(row=0, column=1, sticky="ew", pady=2)
        
        # Высота лестницы
        ttk.Label(self.input_frame, text="Высота лестницы (мм):").grid(row=1, column=0, sticky="w", pady=2)
        self.height_entry = ttk.Entry(self.input_frame)
        self.height_entry.grid(row=1, column=1, sticky="ew", pady=2)
        
        # Количество ступеней
        ttk.Label(self.input_frame, text="Количество ступеней:").grid(row=2, column=0, sticky="w", pady=2)
        self.steps_entry = ttk.Entry(self.input_frame)
        self.steps_entry.grid(row=2, column=1, sticky="ew", pady=2)
        
        # Материал ступеней
        ttk.Label(self.input_frame, text="Материал ступеней:").grid(row=3, column=0, sticky="w", pady=2)
        self.material_combobox = ttk.Combobox(self.input_frame, values=["ДПК", "ПВЛ", "ДПК+1 ПВЛ"])
        self.material_combobox.grid(row=3, column=1, sticky="ew", pady=2)
        
        # Наличие площадки
        self.platform_var = tk.BooleanVar()
        self.platform_check = ttk.Checkbutton(self.input_frame, text="Есть площадка", 
                                            variable=self.platform_var,
                                            command=self.toggle_platform_depth)
        self.platform_check.grid(row=4, column=0, columnspan=2, sticky="w", pady=2)
        
        # Глубина площадки
        self.platform_label = ttk.Label(self.input_frame, text="Глубина площадки (мм):")
        self.platform_label.grid(row=5, column=0, sticky="w", pady=2)
        self.platform_depth_entry = ttk.Entry(self.input_frame)
        self.platform_depth_entry.grid(row=5, column=1, sticky="ew", pady=2)
        
        # Кнопка расчёта
        self.calculate_button = ttk.Button(self.input_frame, text="Рассчитать",
                                         command=self.calculate_and_visualize)
        self.calculate_button.grid(row=6, column=0, columnspan=2, pady=10)
        
        # Результат
        self.result_label = ttk.Label(self.input_frame, text="", wraplength=300)
        self.result_label.grid(row=7, column=0, columnspan=2, sticky="ew")
        
        # Добавляем отступы и расширяемость
        for child in self.input_frame.winfo_children():
            child.grid_configure(padx=5)
        self.input_frame.grid_columnconfigure(1, weight=1)

    def calculate_and_visualize(self):
        try:
            # Получаем входные данные
            width = float(self.width_entry.get())
            height = float(self.height_entry.get())
            steps = int(self.steps_entry.get())
            material = self.material_combobox.get()
            platform = self.platform_var.get()
            platform_depth = float(self.platform_depth_entry.get()) if platform else 0
            
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
                messagebox.showerror("Ошибка", "Выберите материал!")
                return

            # Расчёты
            step_height = height / steps
            base_length = 2 * width + 2 * step_depth * steps
            if platform:
                base_length += 2 * width + 2 * platform_depth
            steps_length = steps * (2 * width + 2 * step_depth)
            vertical_stands = (2 * steps + 2) * step_height
            reinforcements = ((width // 500) + 1) * steps * step_height
            total_length = base_length + steps_length + vertical_stands + reinforcements

            # Вывод результата
            self.result_label.config(
                text=f"Расчёт металла:\n"
                     f"Основание: {base_length:.0f}мм\n"
                     f"Ступени: {steps_length:.0f}мм\n"
                     f"Стойки: {vertical_stands:.0f}мм\n"
                     f"Усиления: {reinforcements:.0f}мм\n"
                     f"ИТОГО: {total_length:.0f}мм"
            )
            
            # Обновляем 3D модель
            self.vis_window.update_model(width, height, steps, material, platform, platform_depth)
            
        except ValueError:
            messagebox.showerror("Ошибка", "Пожалуйста, проверьте правильность введенных данных")

    def toggle_platform_depth(self):
        if self.platform_var.get():
            self.platform_depth_entry.config(state="normal")
            self.platform_label.config(state="normal")
        else:
            self.platform_depth_entry.config(state="disabled")
            self.platform_label.config(state="disabled")

    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    app = StairCalculator()
    app.run()
