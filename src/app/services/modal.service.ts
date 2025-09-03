import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Business } from './business-search.service';
import { HtmlViewerDialogComponent } from '../components/html-viewer-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private dialog = inject(MatDialog);

  openHtmlViewer(business: Business): void {
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
}