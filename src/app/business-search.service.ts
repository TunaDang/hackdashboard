import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ZipCity {
  zipcode: string;
  city: string;
}

export interface Category {
  category: string;
  count: number;
  subcategories?: Category[];
}

export interface Business {
  name: string;
  category: string;
  subcategory?: string;
  address?: string;
  phone?: string;
  rating?: number;
  website?: string;
}

export interface BusinessResponse {
  categories: Category[];
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
    return this.http.get<BusinessResponse>(`${this.baseUrl}/categories?zipcode=${zipcode}`);
  }

  getCategoriesByCity(city: string, zipcodes: string[]): Observable<any> {
    const zipQuery = zipcodes.join(',');
    return this.http.get<any>(`${this.baseUrl}/categories?zipcode=${zipQuery}`);
  }
}