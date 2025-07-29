import { Component, OnInit } from '@angular/core';
import { UVData } from '../../models/uv-data.model';
import { ApiService } from '../../services/api';
import { Color, ScaleType } from '@swimlane/ngx-charts';
import { LineChartModule } from '@swimlane/ngx-charts';
import { DatePipe, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-uv-data',
  templateUrl: './uv-data.html',
  styleUrls: ['./uv-data.css'],
  imports: [LineChartModule, DatePipe, FormsModule, NgStyle],
  standalone: true
})
export class UvDataComponent implements OnInit {
  uvChartData: any[] = [];
  colorScheme: Color = {
    name: 'uv-scale',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#4CAF50', '#FFEB3B', '#FF9800', '#F44336', '#9C27B0']
  };

  currentUV: any = null;
  weatherPrediction: string = '';
  weatherEmoji: string = '⏳';
  maxUV: number | null = null;
  minUV: number | null = null;
  avgUV: number | null = null;

  dateRange: string = '1'; // Cambiado a '1' para que coincida con el primer option
  showCustomDatePicker: boolean = false;
  startDate: string = new Date().toISOString().split('T')[0];
  endDate: string = new Date().toISOString().split('T')[0];

  uvLevels = [
    { name: 'Bajo', range: '0-2', color: '#4CAF50', recommendation: 'Protector solar opcional', emoji: '😊' },
    { name: 'Moderado', range: '3-5', color: '#FFEB3B', recommendation: 'Usa protector SPF 30+', emoji: '☀️' },
    { name: 'Alto', range: '6-7', color: '#FF9800', recommendation: 'Usa sombrero y protector SPF 50+', emoji: '🔥' },
    { name: 'Muy Alto', range: '8-10', color: '#F44336', recommendation: 'Evita el sol al mediodía', emoji: '⚠️' },
    { name: 'Extremo', range: '11+', color: '#9C27B0', recommendation: 'Permanece en interiores', emoji: '🚨' }
  ];

  // Propiedades para interactividad
  hoveredUVValue: any = null;
  selectedUVPoint: any = null;
  tooltipDisabled = false;
  showCirclePoints = true;
  recentData: UVData[] = [];
  
  // Filtros disponibles
  availableDateRanges = [
    { value: '1', label: 'Últimas 24h', hasData: true },
    { value: '3', label: 'Últimos 3 días', hasData: true },
    { value: '7', label: 'Últimos 7 días', hasData: true },
    { value: '30', label: 'Últimos 30 días', hasData: true },
    { value: 'custom', label: 'Personalizado', hasData: true }
  ];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    await this.checkAvailableDataRanges();
    this.loadLatestUVData();
    this.loadUVData();
  }

  async checkAvailableDataRanges(): Promise<void> {
    try {
      for (const range of this.availableDateRanges.filter(r => r.value !== 'custom')) {
        const days = parseInt(range.value);
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        
        const data = await this.apiService.getUVDataByDate(
          start.toISOString(),
          end.toISOString()
        ).toPromise();
        
        range.hasData = !!data?.length;
      }
    } catch (error) {
      console.error('Error checking available data ranges:', error);
      // Mostrar todos los rangos como disponibles si hay error
      this.availableDateRanges.forEach(r => r.hasData = true);
    }
  }

  adjustTimezone(timestamp: string): Date {
    const date = new Date(timestamp);
    date.setHours(date.getHours() - 5);
    return date;
  }

  loadLatestUVData(): void {
    this.apiService.getLatestUVData().subscribe({
      next: (data) => {
        this.currentUV = {
          ...data,
          timestamp: this.adjustTimezone(data.timestamp).toISOString(),
          ...this.getUVLevelInfo(data.value),
          emoji: this.getUVEmoji(data.value)
        };
        this.generateWeatherPrediction();
      },
      error: (err) => console.error('Error loading latest UV data:', err)
    });
  }

  loadUVData(): void {
    if (this.dateRange === 'custom') {
      this.loadCustomData();
    } else {
      const days = parseInt(this.dateRange);
      this.loadDataForLastDays(days);
    }
  }

  loadDataForLastDays(days: number): void {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    this.apiService.getUVDataByDate(
      start.toISOString(),
      end.toISOString()
    ).subscribe({
      next: (data) => {
        this.processChartData(data);
        this.recentData = data.slice(-5).reverse();
      },
      error: (err) => console.error('Error loading UV data:', err)
    });
  }

  loadCustomData(): void {
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59);
      
      this.apiService.getUVDataByDate(
        start.toISOString(),
        end.toISOString()
      ).subscribe({
        next: (data) => {
          this.processChartData(data);
          this.recentData = data.slice(-5).reverse();
        },
        error: (err) => console.error('Error loading custom UV data:', err)
      });
    }
  }

  onDateRangeChange(): void {
    this.showCustomDatePicker = this.dateRange === 'custom';
    if (!this.showCustomDatePicker) {
      this.loadUVData();
    }
  }

  refreshData(): void {
    this.loadInitialData();
  }

  processChartData(data: UVData[]): void {
    if (data.length === 0) {
      this.uvChartData = [];
      this.maxUV = null;
      this.minUV = null;
      this.avgUV = null;
      return;
    }

    const sortedData = [...data].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    this.uvChartData = [{
      name: 'Radiación UV',
      series: sortedData.map(item => ({
        name: this.adjustTimezone(item.timestamp),
        value: item.value,
        extra: this.getUVLevelInfo(item.value)
      }))
    }];

    const values = sortedData.map(item => item.value);
    this.maxUV = Math.max(...values);
    this.minUV = Math.min(...values);
    this.avgUV = parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
  }

  updateChartPointsVisibility(): void {
    // Esperar un ciclo de detección de cambios para asegurar que el gráfico esté renderizado
    setTimeout(() => {
      const chartElement = document.querySelector('ngx-charts-line-chart');
      if (chartElement) {
        const circles = chartElement.querySelectorAll('circle');
        circles.forEach(circle => {
          if (this.showCirclePoints) {
            circle.style.opacity = '1';
          } else {
            circle.style.opacity = '0';
          }
        });
      }
    }, 0);
  }

  // Métodos para interactividad
  onChartHover(event: any): void {
    if (this.tooltipDisabled) return;
    this.hoveredUVValue = event;
    this.selectedUVPoint = null;
  }

  onChartClick(event: any): void {
    this.selectedUVPoint = event;
    this.hoveredUVValue = null;
    this.tooltipDisabled = true;
    
    setTimeout(() => {
      this.tooltipDisabled = false;
    }, 1000);
  }

  toggleCirclePoints(): void {
    this.showCirclePoints = !this.showCirclePoints;
    this.updateChartPointsVisibility();
  }

  // Resto de métodos existentes...
  generateWeatherPrediction(): void {
    if (!this.currentUV) return;

    const hour = new Date(this.currentUV.timestamp).getHours();
    const value = this.currentUV.value;
    let prediction = '';
    let emoji = '';

    if (hour >= 6 && hour < 12) {
      // Mañana
      if (value <= 2) {
        prediction = 'Día parcialmente nublado';
        emoji = '⛅';
      } else if (value <= 5) {
        prediction = 'Día soleado con nubes dispersas';
        emoji = '🌤️';
      } else {
        prediction = 'Día muy soleado y despejado';
        emoji = '☀️';
      }
    } else if (hour >= 12 && hour < 18) {
      // Tarde (horario pico UV)
      if (value <= 2) {
        prediction = 'Cielo mayormente nublado';
        emoji = '☁️';
      } else if (value <= 5) {
        prediction = 'Mezcla de sol y nubes';
        emoji = '🌥️';
      } else if (value <= 7) {
        prediction = 'Sol fuerte con algo de nubosidad';
        emoji = '🌤️';
      } else {
        prediction = 'Cielo completamente despejado';
        emoji = '🔆';
      }
    } else {
      // Noche/temprano en la mañana
      prediction = 'Cielo despejado durante la noche';
      emoji = '🌙';
    }

    // Ajustar según valores extremos
    if (value >= 8) {
      prediction += '. Alta radiación UV esperada';
      emoji = '⚠️ ' + emoji;
    } else if (value <= 1) {
      prediction += '. Baja radiación UV esperada';
      emoji = '🌧️ ' + emoji;
    }

    this.weatherPrediction = prediction;
    this.weatherEmoji = emoji;
  }

  getUVLevelInfo(value: number): any {
    return this.uvLevels.find(level => {
      const range = level.range.split('-');
      const min = parseInt(range[0]);
      const max = range[1] === '+' ? Infinity : parseInt(range[1]);
      return value >= min && value <= max;
    }) || this.uvLevels[0];
  }

  getUVEmoji(value: number): string {
    return this.getUVLevelInfo(value).emoji;
  }

  getUVBackground(): string {
    return this.currentUV ? this.getUVLevelInfo(this.currentUV.value).color : '#f5f5f5';
  }

  getUVCardClass(): string {
    if (!this.currentUV) return 'uv-level-default';
    const value = this.currentUV.value;
    
    if (value <= 2) return 'uv-level-low';
    if (value <= 5) return 'uv-level-moderate';
    if (value <= 7) return 'uv-level-high';
    if (value <= 10) return 'uv-level-veryhigh';
    return 'uv-level-extreme';
  }
  getUVColor(value: number): string {
    if (value <= 2) return '#4CAF50';
    if (value <= 5) return '#FFEB3B';
    if (value <= 7) return '#FF9800';
    if (value <= 10) return '#F44336';
    return '#9C27B0';
  }
}