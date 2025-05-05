import uuid
from typing import Optional, List
from uuid import uuid4
from datetime import datetime
from fastapi import HTTPException
from main_server.db.models import GeneratedReport
from main_server.db.repositories import ReportRepository, S3StorageRepository
import asyncio

class ReportService:
    def __init__(
            self,
            storage_repo: S3StorageRepository,
            report_repo: ReportRepository
    ):
        self._storage = storage_repo
        self._repo = report_repo

    async def generate_report(
            self,
            excel_data: bytes,
            template_data: bytes,
            report_name: str,
            user_id: uuid4
    ) -> GeneratedReport:
        """Generate and save reports"""
        try:
            upload_id = str(uuid4())
            date_prefix = datetime.now().strftime("%Y/%m/%d")

            paths = {
                "excel": f"source/{date_prefix}/{upload_id}/data.xlsx",
                "template": f"source/{date_prefix}/{upload_id}/template.docx",
                "report": f"reports/{date_prefix}/{upload_id}/report.docx"
            }

            upload_tasks = [
                self._storage.upload_file(excel_data, paths["excel"]),
                self._storage.upload_file(template_data, paths["template"])
            ]
            await asyncio.gather(*upload_tasks)

            report_data = self._generate_report_content(excel_data, template_data)

            await self._storage.upload_file(report_data, paths["report"])

            return await self._repo.create_report(
                report_name=report_name,
                report_url=paths["report"],
                excel_url=paths["excel"],
                template_url=paths["template"],
                user_id=user_id
            )

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Report generation failed: {str(e)}"
            )

    async def get_user_reports(
            self,
            user_id: uuid.UUID,
            date_from: Optional[datetime] = None,
            date_to: Optional[datetime] = None
    ) -> List[GeneratedReport]:
        """
        Получает все отчеты, сгенерированные указанным пользователем

        Args:
            user_id: UUID пользователя
            date_from: Начальная дата для фильтрации (опционально)
            date_to: Конечная дата для фильтрации (опционально)

        Returns:
            Список объектов GeneratedReport

        Raises:
            HTTPException: Если произошла ошибка при получении отчетов
        """
        try:
            return await self._repo.get_reports_by_user_id(
                user_id=user_id,
                date_from=date_from,
                date_to=date_to
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to get user reports: {str(e)}"
            )

    # TODO remove
    def _generate_report_content(self, excel_data: bytes, template_data: bytes) -> bytes:
        """
        Генерирует отчет на основе данных Excel и шаблона Word

        Args:
            excel_data: Бинарные данные Excel файла
            template_data: Бинарные данные шаблона Word

        Returns:
            bytes: Бинарные данные сгенерированного отчета
        """
        import pandas as pd
        import matplotlib.pyplot as plt
        from docxtpl import DocxTemplate, InlineImage
        from docx.shared import Mm
        import io
        import numpy as np
        from sklearn.cluster import KMeans

        # Загрузка данных из бинарных объектов
        excel_buffer = io.BytesIO(excel_data)
        template_buffer = io.BytesIO(template_data)

        # === 1. Загрузка и подготовка данных ===
        data = pd.read_excel(
            excel_buffer,
            sheet_name="2025-04-01-00-00-00-e",
            skiprows=1
        )

        # Загружаем шаблон Word из байтового потока
        doc = DocxTemplate(template_buffer)

        # Очистка заголовков и объединение даты и времени
        data.columns = data.columns.astype(str).str.strip()
        data['DateTime'] = pd.to_datetime(
            data['Дата'].astype(str) + ' ' + data['Время'].astype(str),
            dayfirst=True
        )
        data.set_index('DateTime', inplace=True)

        # Оставляем только числовые значения
        data_numeric = data.drop(columns=['Дата', 'Время']).apply(pd.to_numeric, errors='coerce')
        time_delta = (data_numeric.index[1] - data_numeric.index[0]).total_seconds() / 3600
        total_hours = (data_numeric.index.max() - data_numeric.index.min()).total_seconds() / 3600

        # Ресемплируем по дням для анализа
        daily_data = data_numeric.resample('D').sum()

        # Создаем словарь контекста для шаблона
        context = {}

        # Добавляем базовую информацию в контекст
        start_date = daily_data.index.min().strftime('%d.%m.%Y')
        end_date = daily_data.index.max().strftime('%d.%m.%Y')
        context['start_date'] = start_date
        context['end_date'] = end_date
        context['report_title'] = f'Отчет о потреблении электроэнергии за период с {start_date} по {end_date}'

        # === РАЗДЕЛ 1: ОБЩИЙ АНАЛИЗ ПОТРЕБЛЕНИЯ ===
        # График 1: Все устройства
        plt.figure(figsize=(14, 8))
        for column in daily_data.columns:
            plt.plot(daily_data.index, daily_data[column], label=column)

        plt.title('Суточное потребление электроэнергии (все устройства)')
        plt.xlabel('Дата')
        plt.ylabel('Потребление (кВт·ч)')
        plt.grid(True)
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
        plt.tight_layout()
        plt.subplots_adjust(right=0.75)

        buf1 = io.BytesIO()
        plt.savefig(buf1, format='png', dpi=300)
        buf1.seek(0)
        plt.close()

        context['graph_all_devices'] = InlineImage(doc, buf1, width=Mm(150))
        context['graph1_caption'] = 'Рисунок 1. Суточное потребление всех устройств.'

        # График 2: Топ-10 потребителей
        total_consumption = daily_data.sum().sort_values(ascending=False)
        top10 = total_consumption.head(10).index

        plt.figure(figsize=(12, 5))
        for column in top10:
            plt.plot(daily_data.index, daily_data[column], label=column)

        plt.title('Суточное потребление: Топ-10 устройств')
        plt.xlabel('Дата')
        plt.ylabel('Потребление (кВт·ч)')
        plt.grid(True)
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
        plt.tight_layout()
        plt.subplots_adjust(right=0.75)

        buf2 = io.BytesIO()
        plt.savefig(buf2, format='png', dpi=300)
        buf2.seek(0)
        plt.close()

        context['graph_top10'] = InlineImage(doc, buf2, width=Mm(150))
        context['graph2_caption'] = 'Рисунок 2. Топ-10 потребителей электроэнергии.'

        # Данные для таблицы топ-10 потребителей
        top10_data = []
        for name, value in total_consumption.head(10).items():
            top10_data.append({'device': name, 'consumption': f"{value:.2f}"})
        context['top10_consumers'] = top10_data

        # Автоматическая агрегация по категориям
        def classify_meters(column_names):
            """Классифицирует счетчики по типам на основе их названий"""
            categories = {
                'PzS_12V': [],
                'China': [],
                'SM': [],
                'MO': [],
                'BG': [],
                'DIG': [],
                'CP-300': [],
                'Other': []
            }

            for col in column_names:
                col_lower = col.lower()

                if 'pzs' in col_lower and '12v' in col_lower:
                    categories['PzS_12V'].append(col)
                elif 'china' in col_lower:
                    categories['China'].append(col)
                elif ' sm' in col_lower or 'sm ' in col_lower:
                    categories['SM'].append(col)
                elif ' mo' in col_lower or 'mo ' in col_lower:
                    categories['MO'].append(col)
                elif ' bg' in col_lower or 'bg ' in col_lower:
                    categories['BG'].append(col)
                elif 'dig' in col_lower:
                    categories['DIG'].append(col)
                elif 'cp-300' in col_lower:
                    categories['CP-300'].append(col)
                else:
                    categories['Other'].append(col)

            # Удаляем пустые категории
            return {k: v for k, v in categories.items() if v}

        # Получаем классификацию счетчиков
        meter_categories = classify_meters(daily_data.columns)

        # Создаем DataFrame с агрегированными данными
        category_data = pd.DataFrame()
        for category, cols in meter_categories.items():
            category_data[category] = daily_data[cols].sum(axis=1)

        # Строим график категорий
        plt.figure(figsize=(12, 6))
        for column in category_data.columns:
            plt.plot(category_data.index, category_data[column], label=column)

        plt.title('Суточное потребление по автоматически определенным категориям оборудования')
        plt.xlabel('Дата')
        plt.ylabel('Потребление (кВт·ч)')
        plt.grid(True)
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
        plt.tight_layout()

        buf3 = io.BytesIO()
        plt.savefig(buf3, format='png', dpi=300, bbox_inches='tight')
        buf3.seek(0)
        plt.close()

        context['graph_categories'] = InlineImage(doc, buf3, width=Mm(150))
        context['graph3_caption'] = 'Рисунок 3. Суммарное потребление по категориям оборудования.'

        # Добавляем информацию о категориях
        categories_info = []
        for category, cols in meter_categories.items():
            categories_info.append({'category': category, 'count': len(cols)})
        context['categories_info'] = categories_info

        # === РАЗДЕЛ 2: АНАЛИЗ ВРЕМЕННЫХ ЗАКОНОМЕРНОСТЕЙ ===
        # Суточные колебания (анализ по часам)
        hourly_data = data_numeric.resample('h').mean()
        typical_day = hourly_data.groupby(hourly_data.index.hour).mean()

        plt.figure(figsize=(14, 7))
        for column in top10:
            plt.plot(typical_day.index, typical_day[column], label=column)

        plt.title('Среднее потребление по часам суток (Топ-10 устройств)')
        plt.xlabel('Час дня')
        plt.ylabel('Среднее потребление (кВт·ч)')
        plt.xticks(np.arange(0, 24, 1))
        plt.grid(True)
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
        plt.tight_layout()

        buf4 = io.BytesIO()
        plt.savefig(buf4, format='png', dpi=300)
        buf4.seek(0)
        plt.close()

        context['graph_hourly'] = InlineImage(doc, buf4, width=Mm(150))
        context['graph4_caption'] = 'Рисунок 4. Среднее потребление по часам суток для топ-10 устройств.'

        # Анализ пикового потребления
        peak_hours = typical_day.sum(axis=1)
        peak_hour = peak_hours.idxmax()
        context['peak_hour'] = peak_hour
        context['peak_hour_next'] = peak_hour + 1
        context['peak_consumption'] = f"{peak_hours.max():.2f}"

        # График полных и неполных дней
        if len(daily_data) >= 2:
            daily_total = daily_data.sum(axis=1)
            daily_total.index = pd.to_datetime(daily_total.index)

            timestamps_per_day = data_numeric.groupby(data_numeric.index.date).apply(lambda x: x.index)
            counts_per_day = timestamps_per_day.apply(len)
            max_intervals_per_day = counts_per_day.max()
            threshold = int(max_intervals_per_day * 0.95)

            full_days = counts_per_day[counts_per_day >= threshold].index
            partial_days = counts_per_day[counts_per_day < threshold].index

            index_dates = pd.Series(daily_total.index.date, index=daily_total.index)

            combined = pd.DataFrame(index=daily_total.index)
            combined['Полные дни'] = daily_total.where(index_dates.isin(full_days))
            combined['Неполные дни'] = daily_total.where(index_dates.isin(partial_days))

            combined.index = combined.index.strftime('%Y-%m-%d')

            plt.figure(figsize=(14, 8))
            combined.plot(kind='bar', stacked=False, color=['green', 'red'])

            plt.title('Суммарное потребление электроэнергии по дням')
            plt.xlabel('Дата')
            plt.ylabel('Потребление (кВт·ч)')
            plt.xticks(rotation=45)
            plt.grid(True)
            plt.tight_layout()

            buf5 = io.BytesIO()
            plt.savefig(buf5, format='png', dpi=300)
            buf5.seek(0)
            plt.close()

            context['graph_daily'] = InlineImage(doc, buf5, width=Mm(150))
            context['graph5_caption'] = 'Рисунок 5. Суммарное потребление по дням.'

        # === РАЗДЕЛ 3: АНАЛИЗ АНОМАЛИЙ ПОТРЕБЛЕНИЯ ===
        # Параметры анализа
        sigma_threshold = 2  # Пороговое значение σ для определения аномалий
        window_size = 24  # Размер окна для скользящего среднего (в часах)
        top_n = 10  # Количество топовых счетчиков для отображения

        context['sigma_threshold'] = sigma_threshold
        context['window_size'] = window_size
        context['top_n'] = top_n

        # Функция для анализа аномалий
        def analyze_anomalies(device_name, data_series, window=24, sigma=2):
            rolling_mean = data_series.rolling(window=window).mean()
            rolling_std = data_series.rolling(window=window).std()

            anomalies_mask = (data_series > rolling_mean + sigma * rolling_std) | \
                             (data_series < rolling_mean - sigma * rolling_std)
            anomalies = data_series[anomalies_mask]

            if not anomalies.empty:
                deviations = np.abs(anomalies - rolling_mean[anomalies.index])
                return {
                    'count': len(anomalies),
                    'max_deviation': deviations.max(),
                    'mean_deviation': deviations.mean(),
                    'total_deviation': deviations.sum(),
                    'anomaly_points': anomalies
                }
            return None

        # Анализ всех счетчиков
        all_anomalies = []
        for device in data_numeric.columns:
            result = analyze_anomalies(device, data_numeric[device].dropna(),
                                       window=window_size, sigma=sigma_threshold)
            if result:
                all_anomalies.append({
                    'Устройство': device,
                    'Кол-во аномалий': result['count'],
                    'Макс. отклонение (кВт·ч)': result['max_deviation'],
                    'Среднее отклонение (кВт·ч)': result['mean_deviation'],
                    'Суммарное отклонение (кВт·ч)': result['total_deviation']
                })

        # Таблица с результатами по аномалиям
        anomalies_df = pd.DataFrame(all_anomalies)
        if not anomalies_df.empty:
            anomalies_df = anomalies_df.sort_values('Суммарное отклонение (кВт·ч)', ascending=False)
            top_anomalies = anomalies_df.head(top_n)

            # Подготавливаем данные для шаблона
            anomalies_data = []
            for _, row in top_anomalies.iterrows():
                anomalies_data.append({
                    'device': row['Устройство'],
                    'count': row['Кол-во аномалий'],
                    'max_dev': f"{row['Макс. отклонение (кВт·ч)']:.2f}",
                    'mean_dev': f"{row['Среднее отклонение (кВт·ч)']:.2f}",
                    'total_dev': f"{row['Суммарное отклонение (кВт·ч)']:.2f}"
                })
            context['anomalies_data'] = anomalies_data
            context['has_anomalies'] = True

            # Визуализация для топ-3 счетчиков с аномалиями
            anomalies_graphs = []
            for i, (_, row) in enumerate(top_anomalies.head(3).iterrows(), 1):
                device = row['Устройство']
                device_data = data_numeric[device].dropna()

                rolling_mean = device_data.rolling(window=window_size).mean()
                rolling_std = device_data.rolling(window=window_size).std()
                anomalies = device_data[(device_data > rolling_mean + sigma_threshold * rolling_std) |
                                        (device_data < rolling_mean - sigma_threshold * rolling_std)]

                plt.figure(figsize=(14, 4))
                plt.plot(device_data.index, device_data, label='Потребление', color='blue', alpha=0.6)
                plt.plot(rolling_mean.index, rolling_mean, label='Скользящее среднее', color='red')
                plt.scatter(anomalies.index, anomalies, color='red', s=20, label='Аномалии')
                plt.fill_between(rolling_mean.index,
                                 rolling_mean - sigma_threshold * rolling_std,
                                 rolling_mean + sigma_threshold * rolling_std,
                                 color='gray', alpha=0.2, label=f'±{sigma_threshold}σ')
                plt.title(f'Аномалии потребления для {device}')
                plt.xlabel('Дата и время')
                plt.ylabel('Потребление (кВт·ч)')
                plt.legend()
                plt.grid(True)

                buf = io.BytesIO()
                plt.savefig(buf, format='png', dpi=300, bbox_inches='tight')
                buf.seek(0)
                plt.close()

                anomalies_graphs.append({
                    'image': InlineImage(doc, buf, width=Mm(150)),
                    'device': device,
                    'position': i,
                    'caption': f'Рисунок {6 + i - 1}. Аномалии потребления для {device} (топ-{i}).'
                })
            context['anomalies_graphs'] = anomalies_graphs

            # Миниатюры для топ-10 счетчиков с аномалиями
            plt.figure(figsize=(14, 12))
            for i, (_, row) in enumerate(top_anomalies.iterrows(), 1):
                device = row['Устройство']
                device_data = data_numeric[device].dropna()
                rolling_mean = device_data.rolling(window=window_size).mean()
                rolling_std = device_data.rolling(window=window_size).std()

                plt.subplot(5, 2, i)
                plt.plot(device_data.index, device_data, color='blue', alpha=0.6, linewidth=0.8)
                plt.plot(rolling_mean.index, rolling_mean, color='red', linewidth=0.8)
                anomalies = device_data[(device_data > rolling_mean + sigma_threshold * rolling_std) |
                                        (device_data < rolling_mean - sigma_threshold * rolling_std)]
                plt.scatter(anomalies.index, anomalies, color='red', s=10)
                plt.title(f"{device}\nАномалий: {row['Кол-во аномалий']}", fontsize=8)
                plt.grid(True, alpha=0.3)
                plt.xticks(fontsize=6)
                plt.yticks(fontsize=6)

            plt.tight_layout()

            buf_final = io.BytesIO()
            plt.savefig(buf_final, format='png', dpi=300, bbox_inches='tight')
            buf_final.seek(0)
            plt.close()

            context['anomalies_miniatures'] = InlineImage(doc, buf_final, width=Mm(150))
            context[
                'anomalies_miniatures_caption'] = f'Рисунок {6 + 3}. Аномалии потребления для топ-{top_n} счетчиков.'

            # Выводы по аномалиям
            top3_anomalies = []
            for i, (_, row) in enumerate(top_anomalies.head(3).iterrows(), 1):
                top3_anomalies.append({
                    'position': i,
                    'device': row['Устройство'],
                    'count': row['Кол-во аномалий'],
                    'max_dev': f"{row['Макс. отклонение (кВт·ч)']:.2f}",
                    'total_dev': f"{row['Суммарное отклонение (кВт·ч)']:.2f}"
                })
            context['top3_anomalies'] = top3_anomalies
        else:
            context['has_anomalies'] = False

        # === РАЗДЕЛ 4: АНАЛИЗ ВЫКЛЮЧЕННОГО ОБОРУДОВАНИЯ ===
        # 4.1 Статистика выключенного оборудования (значение = 0)
        idle_mask = data_numeric == 0
        idle_counts = idle_mask.sum()
        idle_hours = idle_counts * time_delta
        idle_perc = idle_hours / total_hours * 100
        idle_stats = pd.DataFrame({'часов_выключено': idle_hours, 'процент_выключено': idle_perc})
        idle_stats.sort_values('часов_выключено', ascending=False, inplace=True)

        # Данные для таблицы топ-15 устройств по времени отключения
        idle_devices = []
        for device, row in idle_stats.head(15).iterrows():
            idle_devices.append({
                'device': device,
                'hours': f"{row['часов_выключено']:.2f}",
                'percentage': f"{row['процент_выключено']:.1f}"
            })
        context['idle_devices'] = idle_devices

        # График времени отключения топ-10
        plt.figure(figsize=(12, 6))
        idle_top10 = idle_stats.head(10)
        plt.bar(idle_top10.index, idle_top10['часов_выключено'], color='skyblue')
        plt.title('Топ-10 устройств по времени отключения')
        plt.xlabel('Устройство')
        plt.ylabel('Часов отключено')
        plt.xticks(rotation=45, ha='right')
        plt.grid(axis='y', linestyle='--', alpha=0.7)
        plt.tight_layout()

        buf_idle = io.BytesIO()
        plt.savefig(buf_idle, format='png', dpi=300, bbox_inches='tight')
        buf_idle.seek(0)
        plt.close()

        context['graph_idle'] = InlineImage(doc, buf_idle, width=Mm(150))
        context['graph_idle_caption'] = 'Рисунок 10. Топ-10 устройств по времени отключения.'

        # === 4.2. МЕТОДЫ ОПРЕДЕЛЕНИЯ НЕДОИСПОЛЬЗОВАНИЯ ОБОРУДОВАНИЯ ===
        # Функция для расчета недоиспользования
        def compute_underutilization(method='fixed_pct', param=0.2):
            """
            method:
              'fixed_pct' - фиксированный процент от среднего (param = доля, например 0.2)
              'percentile' - порог на основе k-го перцентиля (param = перцентиль, 5 = 5%)
              'std_dev' - порог = среднее - param * std (param = множитель)
              'kmeans' - кластеризация на 2 группы, низкое/высокое
            """
            if method == 'fixed_pct':
                mean_cons = data_numeric.mean()
                thresh = mean_cons * param
                mask = data_numeric.lt(thresh)

            elif method == 'percentile':
                thresh = data_numeric.quantile(param / 100)
                mask = data_numeric.lt(thresh)

            elif method == 'std_dev':
                mean_cons = data_numeric.mean()
                std_cons = data_numeric.std()
                thresh = mean_cons - param * std_cons
                thresh = thresh.clip(lower=0)  # Предотвращаем отрицательные пороги
                mask = data_numeric.lt(thresh)

            elif method == 'kmeans':
                # Для каждого устройства: кластеризация значений на два кластера
                mask = pd.DataFrame(index=data_numeric.index, columns=data_numeric.columns)
                for col in data_numeric:
                    vals = data_numeric[[col]].dropna().values
                    if len(vals) > 1:  # Проверка на достаточное количество данных
                        vals = vals.reshape(-1, 1)
                        kmeans = KMeans(n_clusters=2, random_state=42).fit(vals)
                        # кластеры, отсортированные по центру
                        centers = sorted([(c, i) for i, c in enumerate(kmeans.cluster_centers_.flatten())])
                        low_label = centers[0][1]
                        labels = pd.Series(kmeans.labels_, index=data_numeric.dropna().index)
                        mask[col] = labels.map(lambda x: x == low_label)
                    else:
                        mask[col] = False
                thresh = None

            else:
                raise ValueError('Unknown method')

            counts = mask.sum()
            hours = counts * time_delta
            perc = hours / total_hours * 100
            stats = pd.DataFrame({
                'часов_недоиспользования': hours,
                'процент_недоиспользования': perc,
                'метод': method
            }).sort_values('часов_недоиспользования', ascending=False)
            return stats, thresh

        # Применяем разные методы
        methods = ['fixed_pct', 'percentile', 'std_dev', 'kmeans']
        params = {'fixed_pct': 0.2, 'percentile': 5, 'std_dev': 1, 'kmeans': None}
        results = {}
        methods_data = []

        for m in methods:
            stats, thresh = compute_underutilization(method=m, param=params[m])
            results[m] = {'stats': stats, 'threshold': thresh}

            # Подготовка данных для шаблона
            method_top5 = []
            for device, row in stats.head(5).iterrows():
                method_top5.append({
                    'device': device,
                    'hours': f"{row['часов_недоиспользования']:.2f}",
                    'percentage': f"{row['процент_недоиспользования']:.1f}"
                })

            method_info = {
                'name': m,
                'top5': method_top5,
                'has_threshold': thresh is not None,
                'is_series': isinstance(thresh, pd.Series) if thresh is not None else False
            }
            methods_data.append(method_info)

        context['methods_data'] = methods_data

        # Выбираем "наилучший" метод для визуализации
        best_method = 'percentile'
        underutil_stats = results[best_method]['stats']

        # График недоиспользования для топ-10 устройств по выбранному методу
        plt.figure(figsize=(12, 6))
        underutil_top10 = underutil_stats.head(10)
        plt.bar(underutil_top10.index, underutil_top10['часов_недоиспользования'], color='salmon')
        plt.title(f'Топ-10 недоиспользуемых устройств (метод {best_method})')
        plt.xlabel('Устройство')
        plt.ylabel('Часов недоиспользования')
        plt.xticks(rotation=45, ha='right')
        plt.grid(axis='y', linestyle='--', alpha=0.7)
        plt.tight_layout()

        buf_underutil = io.BytesIO()
        plt.savefig(buf_underutil, format='png', dpi=300, bbox_inches='tight')
        buf_underutil.seek(0)
        plt.close()

        context['graph_underutil'] = InlineImage(doc, buf_underutil, width=Mm(150))
        context['graph_underutil_caption'] = f'Рисунок 11. Топ-10 устройств по недоиспользованию (метод {best_method}).'
        context['best_method'] = best_method

        # Визуализация использования топ-3 недоиспользуемых устройств
        top3_devices = underutil_stats.head(3).index
        underutil_graphs = []

        for i, device in enumerate(top3_devices, 1):
            device_data = data_numeric[device].dropna()

            if best_method == 'fixed_pct':
                threshold = results[best_method]['threshold'][device]
            elif best_method == 'percentile':
                threshold = results[best_method]['threshold'][device]
            elif best_method == 'std_dev':
                threshold = results[best_method]['threshold'][device]
            else:  # kmeans
                threshold = None

            plt.figure(figsize=(14, 4))
            plt.plot(device_data.index, device_data, label='Потребление', color='blue', alpha=0.7)

            if threshold is not None:
                plt.axhline(y=threshold, color='red', linestyle='--', label=f'Порог недоиспользования')
                # Выделяем периоды недоиспользования
                underutil_mask = device_data < threshold
                underutil_points = device_data[underutil_mask]
                plt.scatter(underutil_points.index, underutil_points, color='red', s=15, alpha=0.5)
                plt.title(f'Анализ недоиспользования для {device}')
                plt.xlabel('Дата и время')
                plt.ylabel('Потребление (кВт·ч)')
                plt.grid(True)
                plt.legend()
                plt.tight_layout()

                buf_device = io.BytesIO()
                plt.savefig(buf_device, format='png', dpi=300, bbox_inches='tight')
                buf_device.seek(0)
                plt.close()

                underutil_graphs.append({
                    'image': InlineImage(doc, buf_device, width=Mm(150)),
                    'caption': f'Рисунок {12 + i - 1}. Анализ недоиспользования для {device} (топ-{i}).',
                    'device': device,
                    'rank': i
                })

            context['underutil_graphs'] = underutil_graphs
            context['top3_underutil_devices'] = list(top3_devices)

            # === РАЗДЕЛ 5: ВЫВОДЫ И РЕКОМЕНДАЦИИ ===
            # Добавляем выводы в контекст
            context['top3_consumers'] = list(total_consumption.head(3).index)
            context['top3_idle_devices'] = list(idle_stats.head(3).index)
            context['top3_underutil'] = list(underutil_stats.head(3).index)

            if not anomalies_df.empty:
                context['has_significant_anomalies'] = True
                context['top3_anomaly_devices'] = list(anomalies_df.head(3)['Устройство'])
            else:
                context['has_significant_anomalies'] = False

            # Рендеринг шаблона
            doc.render(context)

            # Сохранение документа в байтовый поток
            output = io.BytesIO()
            doc.save(output)
            output.seek(0)

            return output.getvalue()