import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BusinessSearchService, ZipCity, Category, Business } from './business-search.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet, 
    FormsModule, 
    CommonModule,
    MatToolbarModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSidenavModule,
    MatListModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  searchQuery = '';
  loading = false;
  categories: Category[] = [];
  businesses: Business[] = [];
  filteredBusinesses: Business[] = [];
  zipCities: ZipCity[] = [];
  selectedCategory: string | null = null;
  selectedSubcategory: string | null = null;

  constructor(private businessService: BusinessSearchService) {
    this.loadZipCities();
  }

  loadZipCities() {
    this.businessService.getZipCities().subscribe({
      next: (data) => {
        console.log('ZipCities response:', data);
        console.log('ZipCities type:', typeof data);
        console.log('ZipCities is array:', Array.isArray(data));
        
        if (Array.isArray(data)) {
          this.zipCities = data;
        } else if (data && typeof data === 'object') {
          // Convert object to array if needed
          this.zipCities = Object.keys(data).map(key => ({
            zipcode: key,
            city: data[key]
          }));
        } else {
          this.zipCities = [];
        }
        console.log('Processed zipCities:', this.zipCities);
      },
      error: (error) => {
        console.error('Error loading zip cities:', error);
        this.zipCities = [];
      }
    });
  }

  performSearch() {
    if (!this.searchQuery.trim()) return;

    this.loading = true;
    this.resetState();

    const isZipcode = /^\d{5}(-\d{4})?$/.test(this.searchQuery.trim());
    
    if (isZipcode) {
      this.searchByZipcode(this.searchQuery.trim());
    } else {
      this.searchByCity(this.searchQuery.trim());
    }
  }

  private resetState() {
    this.categories = [];
    this.businesses = [];
    this.filteredBusinesses = [];
    this.selectedCategory = null;
    this.selectedSubcategory = null;
  }

  private searchByZipcode(zipcode: string) {
    this.businessService.getCategoriesByZipcode(zipcode).subscribe({
      next: (data) => {
        this.processApiResponse(data);
      },
      error: (error) => {
        console.error('Error searching by zipcode:', error);
        this.loading = false;
      }
    });
  }

  private searchByCity(city: string) {
    // Ensure zipCities is an array
    if (!Array.isArray(this.zipCities)) {
      console.error('zipCities is not an array:', this.zipCities);
      this.loading = false;
      return;
    }
    
    const matchingZipCities = this.zipCities.filter(zc => 
      zc.city && zc.city.toLowerCase().includes(city.toLowerCase())
    );
    
    if (matchingZipCities.length === 0) {
      this.loading = false;
      return;
    }

    const zipcodes = matchingZipCities.map(zc => zc.zipcode);
    this.businessService.getCategoriesByCity(city, zipcodes).subscribe({
      next: (data) => {
        this.processApiResponse(data);
      },
      error: (error) => {
        console.error('Error searching by city:', error);
        this.loading = false;
      }
    });
  }

  private processApiResponse(data: any) {
    console.log('API Response:', data);
    console.log('Response type:', typeof data);
    console.log('Is array?', Array.isArray(data));
    console.log('Keys:', Object.keys(data || {}));
    
    if (data && typeof data === 'object') {
      // Handle categories - could be array or object
      if (Array.isArray(data.categories)) {
        this.categories = data.categories.map((cat: any) => ({
          category: cat.category || cat.name || cat,
          count: cat.count || cat.total || 0,
          subcategories: Array.isArray(cat?.subcategories) ? cat.subcategories : []
        }));
      } else if (data.categories && typeof data.categories === 'object') {
        // Convert object to array
        console.log('Categories object:', data.categories);
        this.categories = Object.keys(data.categories).map(key => {
          const categoryData = data.categories[key];
          return {
            category: key,
            count: typeof categoryData === 'number' ? categoryData : (categoryData?.count || 0),
            subcategories: Array.isArray(categoryData?.subcategories) ? categoryData.subcategories : []
          };
        });
      } else {
        this.categories = [];
      }

      // Handle businesses - could be array or object
      if (Array.isArray(data.businesses)) {
        this.businesses = data.businesses;
      } else if (data.businesses && typeof data.businesses === 'object') {
        // Convert object to array
        console.log('Businesses object:', data.businesses);
        this.businesses = Object.keys(data.businesses).map(key => {
          const businessData = data.businesses[key];
          return {
            name: businessData.name || key,
            category: businessData.category || 'Other',
            subcategory: businessData.subcategory,
            address: businessData.address,
            phone: businessData.phone,
            rating: businessData.rating,
            website: businessData.website,
            ...businessData
          };
        });
      } else {
        this.businesses = [];
      }
      
      // If no categories but have businesses, create categories from business data
      if (this.categories.length === 0 && this.businesses.length > 0) {
        const categoryMap = new Map<string, number>();
        this.businesses.forEach(business => {
          const category = business.category || 'Other';
          categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
        });
        
        this.categories = Array.from(categoryMap.entries()).map(([category, count]) => ({
          category,
          count,
          subcategories: []
        }));
      }
    } else {
      console.error('Unexpected data structure:', data);
      this.categories = [];
      this.businesses = [];
    }

    this.filteredBusinesses = this.businesses;
    console.log('Processed categories:', this.categories);
    console.log('Processed businesses:', this.businesses);
    this.loading = false;
  }

  selectCategory(category: Category) {
    this.selectedCategory = category.category;
    this.selectedSubcategory = null;
    
    this.filteredBusinesses = this.businesses.filter(
      business => business.category === category.category
    );
  }

  selectSubcategory(subcategory: Category) {
    this.selectedSubcategory = subcategory.category;
    
    this.filteredBusinesses = this.businesses.filter(
      business => business.subcategory === subcategory.category
    );
  }
}
