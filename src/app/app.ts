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
import { MatIconModule } from '@angular/material/icon';
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
    MatProgressSpinnerModule,
    MatIconModule
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
  selectedCategoryPath: string[] = [];
  expandedCategories: Set<string> = new Set();
  apiCallInfo: string = '';

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
    this.selectedCategoryPath = [];
    this.expandedCategories.clear();
  }

  private searchByZipcode(zipcode: string) {
    this.apiCallInfo = `API Call: GET /api/categories-by-zipcode?zipcode=${zipcode}`;
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
    console.log('Searching by city:', city);
    console.log('ZipCities available:', this.zipCities);
    
    // Ensure zipCities is an array
    if (!Array.isArray(this.zipCities)) {
      console.error('zipCities is not an array:', this.zipCities);
      this.loading = false;
      return;
    }
    
    // More flexible city matching - focus on main Cambridge entries
    const cityLower = city.toLowerCase().trim();
    let matchingZipCities = this.zipCities.filter(zc => {
      if (!zc.city) return false;
      const zcCity = zc.city.toLowerCase().trim();
      
      // For Cambridge, prioritize MA entries first
      if (cityLower.includes('cambridge')) {
        return zcCity.includes('cambridge');
      }
      
      // Try exact match, contains, or starts with
      return zcCity === cityLower || 
             zcCity.includes(cityLower) || 
             cityLower.includes(zcCity) ||
             zcCity.startsWith(cityLower);
    });
    
    console.log('Matching zip cities:', matchingZipCities);
    
    // If we have too many matches (like multiple Cambridge cities), prefer MA ones
    if (matchingZipCities.length > 10 && cityLower.includes('cambridge')) {
      const maEntries = matchingZipCities.filter(zc => zc.city.includes('MA'));
      if (maEntries.length > 0) {
        console.log('Using MA entries only:', maEntries);
        matchingZipCities = maEntries;
      }
    }
    
    if (matchingZipCities.length === 0) {
      console.log('No cities found matching:', city);
      this.loading = false;
      return;
    }

    // Instead of using the city endpoint, aggregate multiple zip code searches
    const zipcodes = matchingZipCities.map(zc => zc.zipcode).filter(zip => zip && zip !== '-1831'); // Filter out invalid zips
    console.log('Using zipcodes for search:', zipcodes);
    
    // Limit to first few zip codes to avoid too many API calls
    const limitedZipcodes = zipcodes.slice(0, 5);
    console.log('Limited to first 5 zipcodes:', limitedZipcodes);
    
    this.aggregateZipCodeResults(limitedZipcodes);
  }

  private aggregateZipCodeResults(zipcodes: string[]) {
    this.apiCallInfo = `API Calls: GET /api/categories-by-zipcode?zipcode=${zipcodes.join(', ')}`;
    const allResponses: any[] = [];
    let completedRequests = 0;
    
    zipcodes.forEach(zipcode => {
      this.businessService.getCategoriesByZipcode(zipcode).subscribe({
        next: (data) => {
          console.log(`Response for ${zipcode}:`, data);
          if (data && (data.categories || data.businesses)) {
            allResponses.push(data);
          }
          completedRequests++;
          
          if (completedRequests === zipcodes.length) {
            console.log('All responses collected:', allResponses);
            this.mergeApiResponses(allResponses);
          }
        },
        error: (error) => {
          console.error(`Error for zipcode ${zipcode}:`, error);
          completedRequests++;
          
          if (completedRequests === zipcodes.length) {
            console.log('All responses collected:', allResponses);
            this.mergeApiResponses(allResponses);
          }
        }
      });
    });
  }

  private mergeApiResponses(responses: any[]) {
    const mergedCategories: any = {};
    const mergedBusinesses: any = {};
    
    responses.forEach(response => {
      // Merge categories (JSON strings with business URL arrays)
      if (response.categories && typeof response.categories === 'object') {
        Object.keys(response.categories).forEach(key => {
          const businessUrls = response.categories[key];
          if (Array.isArray(businessUrls)) {
            if (!mergedCategories[key]) {
              mergedCategories[key] = [];
            }
            // Merge business URLs, avoiding duplicates
            const existingUrls = new Set(mergedCategories[key]);
            businessUrls.forEach(url => {
              if (!existingUrls.has(url)) {
                mergedCategories[key].push(url);
                existingUrls.add(url);
              }
            });
          }
        });
      }
      
      // Merge businesses (legacy format support)
      if (response.businesses && typeof response.businesses === 'object') {
        Object.keys(response.businesses).forEach(key => {
          if (!mergedBusinesses[key]) {
            mergedBusinesses[key] = response.businesses[key];
          }
        });
      }
    });
    
    const mergedResponse = {
      categories: mergedCategories,
      businesses: mergedBusinesses
    };
    
    console.log('Merged response:', mergedResponse);
    this.processApiResponse(mergedResponse);
  }

  private processApiResponse(data: any) {
    console.log('API Response:', data);
    console.log('Response type:', typeof data);
    console.log('Keys:', Object.keys(data || {}));
    
    if (data && typeof data === 'object') {
      // Handle categories first - they contain the business URLs
      if (data.categories && typeof data.categories === 'object') {
        console.log('Categories object:', data.categories);
        this.categories = this.buildCategoryTree(data.categories);
        
        // Extract businesses from category data
        this.businesses = this.extractBusinessesFromCategories(data.categories);
      } else {
        this.categories = [];
        this.businesses = [];
      }

      // Handle legacy businesses format if present
      if (Array.isArray(data.businesses)) {
        this.businesses = [...this.businesses, ...data.businesses];
      } else if (data.businesses && typeof data.businesses === 'object') {
        const legacyBusinesses = Object.keys(data.businesses).map(key => {
          const businessData = data.businesses[key];
          return {
            name: businessData.name || key,
            category: businessData.category || 'Other',
            subcategory: businessData.subcategory,
            address: businessData.address,
            phone: businessData.phone,
            rating: businessData.rating,
            website: businessData.website,
            yelpUrl: businessData.yelpUrl,
            ...businessData
          };
        });
        this.businesses = [...this.businesses, ...legacyBusinesses];
      }
    } else {
      console.error('Unexpected data structure:', data);
      this.categories = [];
      this.businesses = [];
    }

    // Remove duplicate businesses by URL
    this.businesses = this.removeDuplicateBusinesses(this.businesses);
    this.filteredBusinesses = this.businesses;
    console.log('Processed categories:', this.categories);
    console.log('Processed businesses:', this.businesses);
    this.loading = false;
  }

  private extractBusinessesFromCategories(categoriesData: any): Business[] {
    const businesses: Business[] = [];
    const businessUrls = new Set<string>();

    Object.keys(categoriesData).forEach(key => {
      try {
        const path = key.startsWith('[') ? JSON.parse(key) : [key];
        const urls = Array.isArray(categoriesData[key]) ? categoriesData[key] : [];
        
        urls.forEach((url: string) => {
          if (!businessUrls.has(url)) {
            businessUrls.add(url);
            const business = this.extractBusinessFromYelpUrl(url, path);
            businesses.push(business);
          }
        });
      } catch (error) {
        console.error(`Error processing category ${key}:`, error);
      }
    });

    return businesses;
  }

  private extractBusinessFromYelpUrl(yelpUrl: string, categoryPath: string[]): Business {
    // Extract business name from Yelp URL
    const urlParts = yelpUrl.split('/');
    const bizPart = urlParts[urlParts.length - 1];
    const businessName = bizPart
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace(/\d+$/, '') // Remove trailing numbers
      .trim();

    return {
      name: businessName || 'Unknown Business',
      category: categoryPath.join(' > '),
      subcategory: categoryPath.length > 1 ? categoryPath[categoryPath.length - 1] : undefined,
      website: yelpUrl,
      yelpUrl: yelpUrl,
      // These would ideally come from a separate API call to get business details
      address: undefined,
      phone: undefined,
      rating: undefined
    };
  }

  private removeDuplicateBusinesses(businesses: Business[]): Business[] {
    const seen = new Set<string>();
    return businesses.filter(business => {
      const key = business.yelpUrl || business.website || business.name;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private buildCategoryTree(categoriesData: any): Category[] {
    const tree: Category[] = [];
    const pathMap: Map<string, Category> = new Map();

    Object.keys(categoriesData).forEach(key => {
      console.log(`Processing category key: "${key}"`);
      
      let path: string[];
      let businessUrls: string[] = [];
      
      try {
        // Parse the JSON string to get the category array
        if (key.startsWith('[') && key.endsWith(']')) {
          path = JSON.parse(key);
          console.log('Parsed JSON path:', path);
        } else {
          // Fallback to old parsing method
          path = [key.trim()];
        }
        
        // Get business URLs (the count is the number of businesses)
        if (Array.isArray(categoriesData[key])) {
          businessUrls = categoriesData[key];
        }
        
        const count = businessUrls.length;
        console.log(`Category path: ${path.join(' > ')} has ${count} businesses`);
        
        this.addCategoryToTree(tree, pathMap, path, count, businessUrls);
        
      } catch (error) {
        console.error(`Error parsing category key "${key}":`, error);
        // Fallback parsing
        path = [key];
        const count = Array.isArray(categoriesData[key]) ? categoriesData[key].length : 0;
        this.addCategoryToTree(tree, pathMap, path, count, []);
      }
    });

    console.log('Built category tree:', tree);
    return tree;
  }

  private addCategoryToTree(tree: Category[], pathMap: Map<string, Category>, path: string[], count: number, businessUrls: string[] = []) {
    let currentLevel = tree;
    let currentPath: string[] = [];

    for (let i = 0; i < path.length; i++) {
      const categoryName = path[i];
      currentPath = [...currentPath, categoryName];
      const pathKey = currentPath.join(' > ');

      let category = pathMap.get(pathKey);
      
      if (!category) {
        category = {
          name: categoryName,
          count: i === path.length - 1 ? count : 0,
          path: [...currentPath],
          level: i,
          children: [],
          businessUrls: i === path.length - 1 ? businessUrls : []
        };
        
        pathMap.set(pathKey, category);
        currentLevel.push(category);
      } else if (i === path.length - 1) {
        // Update count and merge business URLs for leaf node
        category.count += count;
        if (category.businessUrls && businessUrls.length > 0) {
          category.businessUrls = [...new Set([...category.businessUrls, ...businessUrls])]; // Remove duplicates
        }
      }

      // Update parent counts
      if (i < path.length - 1) {
        category.count += count;
      }

      if (!category.children) {
        category.children = [];
      }
      
      currentLevel = category.children;
    }
  }

  toggleCategory(category: Category) {
    const pathKey = category.path.join(' > ');
    
    if (this.expandedCategories.has(pathKey)) {
      this.expandedCategories.delete(pathKey);
    } else {
      this.expandedCategories.add(pathKey);
    }
  }

  selectCategory(category: Category) {
    this.selectedCategoryPath = [...category.path];
    
    // Filter businesses that match the selected category path
    this.filteredBusinesses = this.businesses.filter(business => {
      const businessCategory = business.category || '';
      const selectedPath = category.path.join(' > ');
      
      // Exact path match
      if (businessCategory === selectedPath) {
        return true;
      }
      
      // Check if business category starts with the selected path (for parent categories)
      if (businessCategory.startsWith(selectedPath)) {
        return true;
      }
      
      // For parent categories, include all children
      if (category.level < category.path.length - 1) {
        const pathPrefix = category.path.slice(0, category.level + 1).join(' > ');
        return businessCategory.startsWith(pathPrefix);
      }
      
      // Fallback matching
      return this.matchesCategoryPath(businessCategory, category.path);
    });
    
    console.log(`Selected category: ${category.path.join(' > ')}`);
    console.log(`Filtered businesses: ${this.filteredBusinesses.length}`);
  }

  private matchesCategoryPath(businessCategory: string, categoryPath: string[]): boolean {
    const category = businessCategory.toLowerCase();
    const path = categoryPath.map(p => p.toLowerCase());
    
    // Check if the business category contains all parts of the selected path
    return path.every(pathPart => category.includes(pathPart));
  }

  isCategoryExpanded(category: Category): boolean {
    const pathKey = category.path.join(' > ');
    return this.expandedCategories.has(pathKey);
  }

  isCategorySelected(category: Category): boolean {
    return this.selectedCategoryPath.length > 0 &&
           this.selectedCategoryPath.join(' > ') === category.path.join(' > ');
  }
}
