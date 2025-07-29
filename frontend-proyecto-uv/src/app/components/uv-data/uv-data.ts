import { Component, OnInit } from '@angular/core';
import { UVData } from '../../models/uv-data.model';
import { ApiService } from '../../services/api';
import { Color, ScaleType } from '@swimlane/ngx-charts';
import { LineChartModule } from '@swimlane/ngx-charts';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-uv-data',
  templateUrl: './uv-data.html',
  styleUrls: ['./uv-data.css'],
  imports: [LineChartModule, DatePipe], // Add required imports here
  standalone: true // Add this if using standalone components
})
export class UvDataComponent implements OnInit {
  // Datos para el gráfico
  uvChartData: any[] = [];
  colorScheme: Color = {
    name: 'uv-scale',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#4CAF50', '#FFEB3B', '#FF9800', '#F44336', '#9C27B0'] // Verde a Morado
  };

  // Opciones del gráfico
  chartOptions = {
    showXAxis: true,
    showYAxis: true,
    gradient: false,
    showLegend: false,
    showXAxisLabel: true,
    xAxisLabel: 'Fecha/Hora',
    showYAxisLabel: true,
    yAxisLabel: 'Índice UV',
    autoScale: true,
    animations: true
  };

  // Datos actuales resaltados
  currentUV: { value: number, riskLevel: string, recommendation: string } | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadUVData();
  }

  getUVBackground(): string {
    if (!this.currentUV) return '#f5f5f5';
    const value = this.currentUV.value;
    
    if (value <= 2) return '#4CAF50'; // Verde
    if (value <= 5) return '#FFEB3B'; // Amarillo
    if (value <= 7) return '#FF9800'; // Naranja
    if (value <= 10) return '#F44336'; // Rojo
    return '#9C27B0'; // Morado
  }

  loadUVData(): void {
    this.apiService.getUVData().subscribe(data => {
      this.processChartData(data);
      this.setCurrentUV(data[0]); // Mostrar el último registro como dato actual
    });
  }

  private processChartData(data: UVData[]): void {
    this.uvChartData = [{
      name: 'Radiación UV',
      series: data.map(item => ({
        name: new Date(item.timestamp),
        value: item.value,
        extra: this.getUVLevelInfo(item.value)
      })).slice(-24) // Últimas 24 horas
    }];
  }

  private setCurrentUV(data: UVData): void {
    const value = data.value;
    this.currentUV = {
      value,
      ...this.getUVLevelInfo(value)
    };
  }

  setCurrentUVFromChart(event: any): void {
    if (event?.series && event?.value) {
      this.currentUV = {
        value: event.value,
        ...this.getUVLevelInfo(event.value)
      };
    }
  }

  private getUVLevelInfo(value: number): { riskLevel: string, recommendation: string } {
    if (value <= 2) return { 
      riskLevel: 'Bajo', 
      recommendation: 'Protector solar opcional' 
    };
    if (value <= 5) return { 
      riskLevel: 'Moderado', 
      recommendation: 'Usa protector SPF 30+' 
    };
    if (value <= 7) return { 
      riskLevel: 'Alto', 
      recommendation: 'Usa sombrero y protector SPF 50+' 
    };
    if (value <= 10) return { 
      riskLevel: 'Muy Alto', 
      recommendation: 'Evita el sol al mediodía' 
    };
    return { 
      riskLevel: 'Extremo', 
      recommendation: 'Permanece en interiores' 
    };
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
}