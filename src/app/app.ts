import { Component, signal, computed, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { map, startWith } from 'rxjs';
import { BusinessSearchService, ZipCity, Category, Business } from './business-search.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { HtmlViewerDialogComponent } from './html-viewer-dialog.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet, 
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatAutocompleteModule,
    MatDialogModule,
    NgTemplateOutlet
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private businessService = inject(BusinessSearchService);
  private dialog = inject(MatDialog);
  
  // Signals for reactive state
  searchQuery = signal('');
  searchControl = new FormControl('');
  loading = signal(false);
  categories = signal<Category[]>([]);
  businesses = signal<Business[]>([]);
  zipCities = signal<ZipCity[]>([]);
  selectedCategoryPath = signal<string[]>([]);
  expandedCategories = signal(new Set<string>());
  apiCallInfo = signal('');
  
  // Computed signals
  filteredBusinesses = computed(() => {
    const allBusinesses = this.businesses();
    const categoryPath = this.selectedCategoryPath();
    
    if (categoryPath.length === 0) {
      // When no category is selected, show all businesses with deduplication and combined categories
      return this.deduplicateBusinesses(allBusinesses.map(business => this.decodeBusinessName(business)))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    
    const matchingBusinesses = allBusinesses.filter(business => {
      const businessCategory = business.category || '';
      const selectedPath = categoryPath.join(' > ');
      
      return businessCategory === selectedPath || 
             businessCategory.startsWith(selectedPath) ||
             this.matchesCategoryPath(businessCategory, categoryPath);
    });
    
    // Deduplicate all filtered businesses
    return this.deduplicateBusinesses(matchingBusinesses)
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  // Convert form control to signal
  searchControlValue = toSignal(this.searchControl.valueChanges.pipe(startWith('')), { initialValue: '' });
  
  // Computed signal for filtered options
  filteredOptions = computed(() => {
    const value = this.searchControlValue() || '';
    return this._filter(value);
  });

  constructor() {
    this.loadZipCities();
    
    // Effect to update API display when category changes
    effect(() => {
      const categoryPath = this.selectedCategoryPath();
      const apiInfo = this.apiCallInfo();
      if (categoryPath.length > 0 && apiInfo) {
        this.updateApiDisplayWithCategory();
      }
    });
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    if (filterValue.length < 2) {
      return [];
    }
    
    // Find matching cities using signal
    const zipCitiesData = this.zipCities();
    const matchingCities = zipCitiesData
      .filter(zc => {
        if (!zc.city) return false;
        return zc.city.toLowerCase().includes(filterValue);
      })
      .map(zc => {
        // Format as "City, State" or just "City" if no state info
        if (zc.city.includes(',')) {
          return zc.city;
        }
        // Extract state from city name if available
        const parts = zc.city.split(' ');
        const lastPart = parts[parts.length - 1];
        if (lastPart.length === 2 && lastPart.match(/^[A-Z]{2}$/)) {
          const cityName = parts.slice(0, -1).join(' ');
          return `${cityName}, ${lastPart}`;
        }
        return zc.city;
      })
      .slice(0, 20); // Limit to 20 suggestions
    
    // Remove duplicates and sort alphabetically
    return [...new Set(matchingCities)].sort();
  }

  onOptionSelected(option: string) {
    this.searchQuery.set(option);
    this.performSearch();
  }

  loadZipCities() {
    this.businessService.getZipCities().subscribe({
      next: (data) => {
        console.log('ZipCities response:', data);
        console.log('ZipCities type:', typeof data);
        console.log('ZipCities is array:', Array.isArray(data));
        
        if (Array.isArray(data)) {
          this.zipCities.set(data);
        } else if (data && typeof data === 'object') {
          // Convert object to array if needed
          const converted = Object.keys(data).map(key => ({
            zipcode: key,
            city: (data as any)[key]
          }));
          this.zipCities.set(converted);
        } else {
          this.zipCities.set([]);
        }
        console.log('Processed zipCities:', this.zipCities());
      },
      error: (error) => {
        console.error('Error loading zip cities:', error);
        this.zipCities.set([]);
      }
    });
  }

  performSearch() {
    const query = this.searchControl.value || this.searchQuery();
    if (!query.trim()) return;
    
    this.searchQuery.set(query.trim());

    this.loading.set(true);
    this.resetState();

    const isZipcode = /^\d{5}(-\d{4})?$/.test(this.searchQuery().trim());
    
    if (isZipcode) {
      this.searchByZipcode(this.searchQuery().trim());
    } else {
      this.searchByCity(this.searchQuery().trim());
    }
  }

  private resetState() {
    this.categories.set([]);
    this.businesses.set([]);
    this.selectedCategoryPath.set([]);
    this.expandedCategories.set(new Set());
  }

  private searchByZipcode(zipcode: string) {
    this.apiCallInfo.set(`GET nerds21.redmond.corp.microsoft.com:9000/biz/categories?zipcode=${zipcode}`);
    this.businessService.getCategoriesByZipcode(zipcode).subscribe({
      next: (data) => {
        this.processApiResponse(data);
      },
      error: (error) => {
        console.error('Error searching by zipcode:', error);
        this.loading.set(false);
      }
    });
  }

  private searchByCity(city: string) {
    console.log('Searching by city:', city);
    const zipCitiesData = this.zipCities();
    console.log('ZipCities available:', zipCitiesData);
    
    // Ensure zipCities is an array
    if (!Array.isArray(zipCitiesData)) {
      console.error('zipCities is not an array:', zipCitiesData);
      this.loading.set(false);
      return;
    }
    
    // More flexible city matching - focus on main Cambridge entries
    const cityLower = city.toLowerCase().trim();
    let matchingZipCities = zipCitiesData.filter(zc => {
      if (!zc.city) return false;
      const zcCity = zc.city.toLowerCase().trim();
      
      // Try exact match, contains, or starts with
      return zcCity === cityLower || 
             zcCity.includes(cityLower) || 
             cityLower.includes(zcCity) ||
             zcCity.startsWith(cityLower);
    });
    
    console.log('Matching zip cities:', matchingZipCities);
    
    if (matchingZipCities.length === 0) {
      console.log('No cities found matching:', city);
      this.loading.set(false);
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
    // Display what we want the API to support in the future
    const zipcodesJson = JSON.stringify(zipcodes);
    this.apiCallInfo.set(`GET nerds21.redmond.corp.microsoft.com:9000/biz/categories?zipcodes=${zipcodesJson}`);
    const allResponses: any[] = [];
    let completedRequests = 0;
    
    zipcodes.forEach(zipcode => {
      this.businessService.getCategoriesByZipcode(zipcode).subscribe({
        next: (data) => {
          console.log(`Response for ${zipcode}:`, data);
          if (data && data.businesses) {
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
    const mergedBusinesses: any = {};
    
    responses.forEach(response => {
      // Merge businesses data
      if (response.businesses && typeof response.businesses === 'object') {
        Object.keys(response.businesses).forEach(key => {
          if (!mergedBusinesses[key]) {
            mergedBusinesses[key] = response.businesses[key];
          }
        });
      }
    });
    
    const mergedResponse = {
      businesses: mergedBusinesses
    };
    
    console.log('Merged response:', mergedResponse);
    this.processApiResponse(mergedResponse);
  }

  private processApiResponse(data: any) {
    console.log('API Response:', data);
    console.log('Response type:', typeof data);
    console.log('Keys:', Object.keys(data || {}));
    
    let businesses: Business[] = [];

    if (data && typeof data === 'object') {
      // Handle businesses format - this has the full business data
      if (data.businesses && typeof data.businesses === 'object' && !Array.isArray(data.businesses)) {
        console.log('Processing businesses object:', Object.keys(data.businesses).length, 'businesses');
        const businessesFromData: Business[] = [];
        
        Object.keys(data.businesses).forEach(yelpUrl => {
          const businessData = data.businesses[yelpUrl];
          const categoryPaths = this.formatCategories(businessData.categories);
          
          // Create separate business entry for each category path
          categoryPaths.forEach(categoryPath => {
            businessesFromData.push({
              name: businessData.name || 'Unknown Business',
              category: categoryPath,
              address: businessData.address,
              webDomain: businessData.webDomain,
              description: businessData.description,
              rating: businessData.rating,
              reviewCount: businessData.reviewCount,
              cityState: businessData.cityState,
              country: businessData.country,
              isClosed: businessData.isClosed,
              yelpUrl: yelpUrl
            });
          });
        });
        
        businesses = [...businesses, ...businessesFromData];
        console.log('Processed businesses with domains:', businessesFromData.filter(b => b.webDomain).length);
        console.log('Processed businesses with descriptions:', businessesFromData.filter(b => b.description).length);
        console.log('Total business entries (with duplicates):', businessesFromData.length);
      } else if (Array.isArray(data.businesses)) {
        businesses = [...businesses, ...data.businesses];
      }
    } else {
      console.error('Unexpected data structure:', data);
    }

    // Keep all business entries (including duplicates across categories) but clean invalid entries
    const cleanedBusinesses = this.cleanBusinesses(businesses);
    
    // Build category tree based on businesses data only
    const categories = this.buildCategoryTreeFromBusinesses(cleanedBusinesses);
    
    this.categories.set(categories);
    this.businesses.set(cleanedBusinesses);
    console.log('Processed categories:', categories);
    console.log('Processed businesses:', cleanedBusinesses);
    this.loading.set(false);
  }


  private cleanBusinesses(businesses: Business[]): Business[] {
    return businesses.filter(business => {
      // Keep all businesses but filter out invalid ones
      return business.name && business.name !== 'Unknown Business' && business.yelpUrl;
    });
  }

  private deduplicateBusinesses(businesses: Business[]): Business[] {
    const businessMap = new Map<string, Business>();
    
    businesses.forEach(business => {
      const decodedBusiness = this.decodeBusinessName(business);
      const key = decodedBusiness.yelpUrl || `${decodedBusiness.name}-${decodedBusiness.address || 'no-address'}`;
      
      if (businessMap.has(key)) {
        // Combine category paths for same business
        const existingBusiness = businessMap.get(key)!;
        const existingCategories = existingBusiness.category || '';
        const newCategory = decodedBusiness.category || '';
        
        // Split existing and new categories properly and combine without duplicates
        const existingCatArray = existingCategories.split(', ').filter(cat => cat.trim());
        const newCatArray = newCategory.split(', ').filter(cat => cat.trim());
        
        const categoriesSet = new Set([...existingCatArray, ...newCatArray]);
        
        // Sort categories alphabetically and join with commas
        existingBusiness.category = Array.from(categoriesSet).sort().join(', ');
      } else {
        businessMap.set(key, decodedBusiness);
      }
    });
    
    return Array.from(businessMap.values());
  }

  private decodeHtmlEntities(text: string): string {
    const entityMap: { [key: string]: string } = {
      '&#x27;': "'",
      '&apos;': "'",
      '&quot;': '"',
      '&lt;': '<',
      '&gt;': '>',
      '&amp;': '&',
      '&#39;': "'",
      '&#34;': '"'
    };
    
    return text.replace(/&#x27;|&apos;|&quot;|&lt;|&gt;|&amp;|&#39;|&#34;/g, (match) => {
      return entityMap[match] || match;
    });
  }

  private decodeBusinessName(business: Business): Business {
    const decodedBusiness = { ...business };
    if (decodedBusiness.name) {
      try {
        // First URL decode
        decodedBusiness.name = decodeURIComponent(decodedBusiness.name.replace(/\+/g, ' '));
        // Then HTML entity decode
        decodedBusiness.name = this.decodeHtmlEntities(decodedBusiness.name);
      } catch (error) {
        // If decoding fails, keep original name
        console.warn('Failed to decode business name:', decodedBusiness.name, error);
      }
    }
    return decodedBusiness;
  }


  toggleCategory(category: Category) {
    const pathKey = category.path.join(' > ');
    const currentExpanded = this.expandedCategories();
    const newExpanded = new Set(currentExpanded);
    
    if (currentExpanded.has(pathKey)) {
      newExpanded.delete(pathKey);
    } else {
      newExpanded.add(pathKey);
    }
    
    this.expandedCategories.set(newExpanded);
  }

  selectCategory(category: Category) {
    this.selectedCategoryPath.set([...category.path]);
    
    // Auto-expand the category to show subcategories
    if (category.children && category.children.length > 0) {
      const pathKey = category.path.join(' > ');
      const currentExpanded = this.expandedCategories();
      const newExpanded = new Set(currentExpanded);
      newExpanded.add(pathKey);
      this.expandedCategories.set(newExpanded);
    }
    
    console.log(`Selected category: ${category.path.join(' > ')}`);
    console.log(`Filtered businesses: ${this.filteredBusinesses().length}`);
  }

  selectAllCategories() {
    // Reset to show all categories/businesses without making API call
    this.selectedCategoryPath.set([]);
    console.log('Selected all categories');
    console.log(`Filtered businesses: ${this.filteredBusinesses().length}`);
  }

  private updateApiDisplayWithCategory() {
    const apiInfo = this.apiCallInfo();
    const categoryPath = this.selectedCategoryPath();
    
    if (apiInfo && categoryPath.length > 0) {
      // Extract the base URL from the current API call
      const baseMatch = apiInfo.match(/GET\s+([^?]+)/);
      if (baseMatch) {
        const baseUrl = baseMatch[1];
        const zipMatch = apiInfo.match(/zipcode(?:s?)=([^&\s]+)/);
        
        if (zipMatch) {
          const zipcodes = zipMatch[1];
          const categoryPathJson = JSON.stringify([categoryPath]);
          this.apiCallInfo.set(`GET ${baseUrl}?zipcode=${zipcodes}&categorypath=${categoryPathJson}`);
        }
      }
    }
  }

  private matchesCategoryPath(businessCategory: string, categoryPath: string[]): boolean {
    const category = businessCategory.toLowerCase();
    const path = categoryPath.map(p => p.toLowerCase());
    
    // Check if the business category contains all parts of the selected path
    return path.every(pathPart => category.includes(pathPart));
  }

  isCategoryExpanded(category: Category): boolean {
    const pathKey = category.path.join(' > ');
    return this.expandedCategories().has(pathKey);
  }

  isCategorySelected(category: Category): boolean {
    const selectedPath = this.selectedCategoryPath();
    return selectedPath.length > 0 &&
           selectedPath.join(' > ') === category.path.join(' > ');
  }

  getApiUrl(): string {
    const apiInfo = this.apiCallInfo();
    if (!apiInfo) return '';
    
    // The apiCallInfo already contains the full URL we want to call
    // Format: "GET nerds21.redmond.corp.microsoft.com:9000/biz/categories?zipcode=02138"
    const match = apiInfo.match(/GET\s+(.+)$/);
    if (match && match[1]) {
      // Add http:// if not already present
      const url = match[1];
      return url.startsWith('http') ? url : `http://${url}`;
    }
    
    return '';
  }

  getFirstTwentyWords(description: string): string {
    if (!description) return '';
    const words = description.split(' ');
    const firstTwenty = words.slice(0, 20).join(' ');
    return firstTwenty + (words.length > 20 ? '...' : '');
  }

  openHtmlViewer(business: Business): void {
    if (!business.webDomain) {
      return; // Don't open if no domain
    }

    // Extract Yelp ID from URL for API call
    const yelpId = this.extractYelpIdFromUrl(business.yelpUrl || '');
    
    // Open dialog with placeholder data for now
    const dialogRef = this.dialog.open(HtmlViewerDialogComponent, {
      width: '90vw',
      maxWidth: '900px',
      data: {
        businessName: business.name,
        domain: business.webDomain,
        yelpUrl: business.yelpUrl,
        loading: false,
        error: null,
        htmlContent: null // Will show placeholder template
      }
    });

    // In the future, when the endpoint is ready, this would make the API call:
    // this.businessService.getBusinessData(yelpId).subscribe({
    //   next: (data) => {
    //     dialogRef.componentInstance.data = {
    //       ...dialogRef.componentInstance.data,
    //       loading: false,
    //       htmlContent: data.domainHtml || data.html
    //     };
    //   },
    //   error: (error) => {
    //     dialogRef.componentInstance.data = {
    //       ...dialogRef.componentInstance.data,
    //       loading: false,
    //       error: 'Failed to fetch HTML content: ' + error.message
    //     };
    //   }
    // });
  }

  private extractYelpIdFromUrl(yelpUrl: string): string {
    if (!yelpUrl) return '';
    // Extract the business ID from Yelp URL
    // Example: https://www.yelp.com/biz/business-name-location -> business-name-location
    const matches = yelpUrl.match(/\/biz\/([^?]+)/);
    return matches ? matches[1] : '';
  }

  private formatCategories(categories: string[][]): string[] {
    if (!categories || !Array.isArray(categories) || categories.length === 0) return ['Other'];
    
    // Return all category paths so businesses can appear in multiple categories
    return categories.map(categoryPath => 
      categoryPath.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)).join(' > ')
    );
  }

  private buildCategoryTreeFromBusinesses(businesses: Business[]): Category[] {
    const tree: Category[] = [];
    const pathMap: Map<string, Category> = new Map();

    // Count businesses by category path
    const categoryBusinessCounts: Map<string, Set<string>> = new Map();

    businesses.forEach(business => {
      if (!business.category || business.category === 'Other') return;
      
      // Split category path like "Shopping > Fashion > Shoes" back into array
      const categoryParts = business.category.split(' > ').map(part => part.toLowerCase());
      
      // Add business to each level of the category path
      for (let i = 1; i <= categoryParts.length; i++) {
        const pathKey = categoryParts.slice(0, i).join(' > ');
        
        if (!categoryBusinessCounts.has(pathKey)) {
          categoryBusinessCounts.set(pathKey, new Set());
        }
        
        // Use yelpUrl as unique identifier for counting
        if (business.yelpUrl) {
          categoryBusinessCounts.get(pathKey)!.add(business.yelpUrl);
        }
      }
    });

    // Build tree structure with accurate counts
    categoryBusinessCounts.forEach((businessSet, pathKey) => {
      const pathParts = pathKey.split(' > ');
      this.addCategoryToTreeFromPath(tree, pathMap, pathParts, Array.from(businessSet));
    });

    return tree;
  }

  private addCategoryToTreeFromPath(tree: Category[], pathMap: Map<string, Category>, pathParts: string[], businessUrls: string[]) {
    let currentLevel = tree;
    let currentPath: string[] = [];

    for (let i = 0; i < pathParts.length; i++) {
      const categoryName = pathParts[i].charAt(0).toUpperCase() + pathParts[i].slice(1);
      currentPath = [...currentPath, categoryName];
      const pathKey = currentPath.join(' > ');

      let category = pathMap.get(pathKey);
      
      if (!category) {
        category = {
          name: categoryName,
          path: [...currentPath],
          level: i,
          children: [],
          businessUrls: i === pathParts.length - 1 ? businessUrls : [] // Add URLs to leaf nodes
        };
        
        pathMap.set(pathKey, category);
        currentLevel.push(category);
        currentLevel.sort((a, b) => a.name.localeCompare(b.name));
      } else if (i === pathParts.length - 1) {
        category.businessUrls = businessUrls; // Update leaf node URLs
      }

      if (!category.children) {
        category.children = [];
      }
      
      currentLevel = category.children;
    }

    this.updateParentCounts(tree);
  }

  private updateParentCounts(categories: Category[]) {
    categories.forEach(category => {
      if (category.children && category.children.length > 0) {
        this.updateParentCounts(category.children);
        // Sort children alphabetically
        category.children.sort((a, b) => a.name.localeCompare(b.name));
        
        // Collect unique business URLs from all children
        const childUrls = new Set<string>();
        category.children.forEach(child => {
          child.businessUrls.forEach(url => childUrls.add(url));
        });
        
        // Combine parent's own businessUrls (null leaf businesses)
        const allUrls = new Set<string>();
        category.businessUrls.forEach(url => allUrls.add(url));
        childUrls.forEach(url => allUrls.add(url));
        
        // Update parent with the combined unique URLs
        category.businessUrls = Array.from(allUrls);
      }
    });
    
    // Sort the current level alphabetically
    categories.sort((a, b) => a.name.localeCompare(b.name));
  }
}
