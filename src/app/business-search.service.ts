import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

export interface ZipCity {
  zipcode: string;
  city: string;
}

export interface Category {
  name: string;
  path: string[];
  level: number;
  children?: Category[];
  businessUrls: string[];
}

export interface Business {
  name: string;
  category: string;
  address?: string;
  webDomain?: string;
  description?: string;
  rating?: number;
  reviewCount?: string;
  cityState?: string;
  country?: string;
  isClosed?: boolean;
  yelpUrl?: string;
}

export interface BusinessResponse {
  businesses: Business[];
}

@Injectable({
  providedIn: 'root'
})
export class BusinessSearchService {
  private baseUrl = '/api';

  constructor(private http: HttpClient) {}

  getZipCities(): Observable<ZipCity[]> {
    return this.http.get<ZipCity[]>(`${this.baseUrl}/zipcities`);
  }

  getCategoriesByZipcode(zipcode: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/categories?zipcode=${zipcode}`);
  }

  getCategoriesByCity(city: string, zipcodes: string[]): Observable<any> {
    const zipQuery = zipcodes.join(',');
    return this.http.get<any>(`${this.baseUrl}/categories?zipcode=${zipQuery}`);
  }

  getBusinessData(yelpId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/bizdata?id=${yelpId}`);
  }
}