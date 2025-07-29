import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { UVData } from '../models/uv-data.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getUVData(limit: number = 100, page: number = 1): Observable<UVData[]> {
    return this.http.get<UVData[]>(`${this.API_URL}/uv?limit=${limit}&page=${page}`);
  }

  // En ApiService
  getLatestUVData(): Observable<UVData> {
    return this.http.get<UVData>(`${this.API_URL}/uv/latest`).pipe(
      catchError(this.handleError)
    );
  }

  getUVDataByDate(start: string, end: string): Observable<UVData[]> {
    return this.http.get<UVData[]>(`${this.API_URL}/uv/filter?startDate=${start}&endDate=${end}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error al comunicarse con el servidor';
    if (error.status === 0) {
      errorMessage = 'Servidor no disponible. Verifica tu conexión.';
    } else if (error.status === 404) {
      errorMessage = 'Endpoint no encontrado.';
    }
    return throwError(() => new Error(errorMessage));
  }
}