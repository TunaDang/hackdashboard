import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';

export interface HtmlViewerDialogData {
  businessName: string;
  domain: string;
  yelpUrl: string;
  htmlContent?: string;
  loading?: boolean;
  error?: string;
}

@Component({
  selector: 'app-html-viewer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="html-viewer-dialog">
      <h2 mat-dialog-title>{{ data.businessName }} - Domain HTML</h2>
      
      <mat-dialog-content class="dialog-content">
        @if (data.loading) {
          <div class="loading-container">
            <mat-spinner diameter="50"></mat-spinner>
            <p>Loading HTML content for {{ data.domain }}...</p>
          </div>
        } @else if (data.error) {
          <div class="error-container">
            <p class="error-message">{{ data.error }}</p>
            <p class="placeholder-note">
              <strong>Note:</strong> This is using placeholder data since the bizdata endpoint is not implemented yet.
            </p>
          </div>
        } @else if (data.htmlContent) {
          <div class="html-content">
            <div class="domain-info">
              <strong>Domain:</strong> {{ data.domain }}
            </div>
            <div class="html-display">
              <pre>{{ data.htmlContent }}</pre>
            </div>
          </div>
        } @else {
          <div class="placeholder-container">
            <h3>Placeholder HTML Content</h3>
            <p><strong>Domain:</strong> {{ data.domain }}</p>
            <p><strong>Business:</strong> {{ data.businessName }}</p>
            <div class="sample-html">
              <h4>Sample HTML Structure:</h4>
              <pre>&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
&lt;head&gt;
    &lt;meta charset="UTF-8"&gt;
    &lt;meta name="viewport" content="width=device-width, initial-scale=1.0"&gt;
    &lt;title&gt;{{ data.businessName }}&lt;/title&gt;
&lt;/head&gt;
&lt;body&gt;
    &lt;header&gt;
        &lt;h1&gt;Welcome to {{ data.businessName }}&lt;/h1&gt;
    &lt;/header&gt;
    &lt;main&gt;
        &lt;p&gt;This is placeholder HTML content for {{ data.domain }}&lt;/p&gt;
        &lt;p&gt;The actual HTML will be fetched from the bizdata API endpoint.&lt;/p&gt;
    &lt;/main&gt;
&lt;/body&gt;
&lt;/html&gt;</pre>
            </div>
            <p class="api-note">
              <strong>Note:</strong> This modal will display the actual HTML content once the 
              <code>bizdata?id=YELPID</code> endpoint is implemented.
            </p>
          </div>
        }
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="close()">Close</button>
        @if (data.domain) {
          <a mat-raised-button color="primary" [href]="'https://' + data.domain" target="_blank">
            Visit {{ data.domain }}
          </a>
        }
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .html-viewer-dialog {
      width: 100%;
      max-width: 800px;
    }
    
    .dialog-content {
      min-height: 300px;
      max-height: 600px;
      overflow-y: auto;
    }
    
    .loading-container,
    .error-container,
    .placeholder-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      text-align: center;
    }
    
    .error-message {
      color: #d32f2f;
      font-weight: bold;
    }
    
    .placeholder-note,
    .api-note {
      background-color: #e3f2fd;
      padding: 12px;
      border-radius: 4px;
      border-left: 4px solid #1976d2;
      margin: 16px 0;
      font-size: 0.9em;
    }
    
    .domain-info {
      background-color: #f5f5f5;
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      font-family: monospace;
    }
    
    .html-display pre,
    .sample-html pre {
      background-color: #f8f8f8;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 16px;
      overflow-x: auto;
      font-size: 0.85em;
      line-height: 1.4;
      white-space: pre-wrap;
    }
    
    .sample-html h4 {
      margin: 16px 0 8px 0;
      color: #424242;
    }
    
    code {
      background-color: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }
  `]
})
export class HtmlViewerDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<HtmlViewerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: HtmlViewerDialogData
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}