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
  categories: string[][];
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
  //private baseUrl = '/api';
  private baseUrl = 'http://nerds21.redmond.corp.microsoft.com:9000/api';

  constructor(private http: HttpClient) {}

  getZipCities(): Observable<ZipCity[]> {
    return this.http.get<ZipCity[]>(`${this.baseUrl}/zipcities`);
  }

  getBusinessByZipcode(zipcode: string): Observable<any> {
    return this.http.get<Business[]>(`${this.baseUrl}/bizlist?zipcode=${zipcode}`);
  }

  getBusinessByZipcodes(zipcodes: string[]): Observable<any> {
    const zipQuery = JSON.stringify(zipcodes);
    return this.http.get<Business[]>(`${this.baseUrl}/bizlist?zipcodes=${zipQuery}`);
  }

  getBusinessData(yelpId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/bizdata?id=${yelpId}`);
  }
}