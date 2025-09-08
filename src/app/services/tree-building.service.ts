import { Injectable } from '@angular/core';
import { Business, Category } from './business-search.service';

@Injectable({
  providedIn: 'root'
})
export class TreeBuildingService {

  buildCategoryTreeFromBusinesses(businesses: Business[]): Category[] {
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